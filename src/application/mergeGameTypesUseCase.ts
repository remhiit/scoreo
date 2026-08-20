import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

export interface MergeGameTypesPreview {
  /** Matches played under the duplicate — how many would be moved. */
  affectedMatches: number
  /**
   * The two game types don't score the same way. Not a blocker — the kept game
   * type's rules simply become the ones applied to the moved matches — but the
   * winners of those matches can change, so the UI warns about it.
   */
  rulesDiffer: boolean
}

/** `tieBreakCondition` only matters under SECONDARY_SCORE; comparing it otherwise flags a difference nothing acts on. */
function sameScoringRules(a: GameType, b: GameType): boolean {
  if (a.winCondition !== b.winCondition) return false
  if (a.tieBreakRule !== b.tieBreakRule) return false
  if (a.tieBreakRule !== 'SECONDARY_SCORE') return true
  return a.tieBreakCondition === b.tieBreakCondition
}

/**
 * Folds a duplicate game type into the one to keep: every match moves to the
 * kept game type, then the duplicate is hard-deleted. Archiving isn't enough —
 * it only hides the duplicate, leaving its matches under a separate game and
 * splitting History's filter, per-game trophies and the game record in two.
 */
export class MergeGameTypesUseCase {
  constructor(
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchDraftRepository: MatchDraftRepository,
  ) {}

  preview(sourceId: string, targetId: string): MergeGameTypesPreview {
    if (sourceId === targetId) return { affectedMatches: 0, rulesDiffer: false }

    const source = this.gameTypeRepository.findById(sourceId)
    const target = this.gameTypeRepository.findById(targetId)
    return {
      affectedMatches: this.matchesOf(sourceId).length,
      rulesDiffer: source !== undefined && target !== undefined && !sameScoringRules(source, target),
    }
  }

  invoke(sourceId: string, targetId: string): void {
    const source = this.gameTypeRepository.findById(sourceId)
    if (!source) throw new NotFoundError('GameType', sourceId)
    const target = this.gameTypeRepository.findById(targetId)
    if (!target) throw new NotFoundError('GameType', targetId)
    if (sourceId === targetId) {
      throw new ValidationError('gameTypeId', 'A game type cannot be merged into itself')
    }

    const moved = this.matchesOf(sourceId).map((match) => ({ ...match, gameTypeId: targetId }))
    // One saveAll rather than one save per match: a single change notification,
    // hence a single debounced auto-sync push.
    if (moved.length > 0) this.matchRepository.saveAll(moved)

    // A draft naming the duplicate would keep an id nothing resolves to.
    const draft = this.matchDraftRepository.load()
    if (draft?.gameTypeId === sourceId) this.matchDraftRepository.clear()

    // The kept game type inherits the duplicate's activity: folding an active
    // duplicate into an archived target would otherwise hide the result.
    if (source.active && !target.active) this.gameTypeRepository.save({ ...target, active: true })

    this.gameTypeRepository.hardDelete(sourceId)
  }

  private matchesOf(gameTypeId: string) {
    return this.matchRepository.getAll().filter((match) => match.gameTypeId === gameTypeId)
  }
}
