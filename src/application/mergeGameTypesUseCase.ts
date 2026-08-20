import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

export interface MergeGameTypesPreview {
  /** Matches played under one of the duplicates — how many would be moved. */
  affectedMatches: number
  /**
   * At least one duplicate doesn't score like the game type being kept. Not a
   * blocker — the kept game type's rules simply become the ones applied to the
   * moved matches — but the winners of those matches can change, so the UI
   * warns about it.
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
 * Folds one or more duplicate game types into the one to keep: every match moves
 * to the kept game type, then each duplicate is hard-deleted. Archiving isn't
 * enough — it only hides a duplicate, leaving its matches under a separate game
 * and splitting History's filter, per-game trophies and the game record apart.
 */
export class MergeGameTypesUseCase {
  constructor(
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchDraftRepository: MatchDraftRepository,
  ) {}

  preview(keptId: string, duplicateIds: readonly string[]): MergeGameTypesPreview {
    const duplicates = new Set(duplicateIds)
    duplicates.delete(keptId)
    if (duplicates.size === 0) return { affectedMatches: 0, rulesDiffer: false }

    const kept = this.gameTypeRepository.findById(keptId)
    const merged = [...duplicates].map((id) => this.gameTypeRepository.findById(id))
    return {
      affectedMatches: this.matchesOf(duplicates).length,
      rulesDiffer:
        kept !== undefined && merged.some((gt) => gt !== undefined && !sameScoringRules(gt, kept)),
    }
  }

  invoke(keptId: string, duplicateIds: readonly string[]): void {
    const kept = this.gameTypeRepository.findById(keptId)
    if (!kept) throw new NotFoundError('GameType', keptId)

    const duplicates = new Set(duplicateIds)
    if (duplicates.has(keptId)) {
      throw new ValidationError('gameTypeId', 'A game type cannot be merged into itself')
    }
    if (duplicates.size === 0) {
      throw new ValidationError('gameTypeId', 'Select at least one duplicate to merge')
    }
    const merged = [...duplicates].map((id) => {
      const gameType = this.gameTypeRepository.findById(id)
      if (!gameType) throw new NotFoundError('GameType', id)
      return gameType
    })

    const moved = this.matchesOf(duplicates).map((match) => ({ ...match, gameTypeId: keptId }))
    // One saveAll rather than one save per match: a single change notification,
    // hence a single debounced auto-sync push.
    if (moved.length > 0) this.matchRepository.saveAll(moved)

    // A draft naming a duplicate would keep an id nothing resolves to.
    const draft = this.matchDraftRepository.load()
    if (draft && duplicates.has(draft.gameTypeId)) this.matchDraftRepository.clear()

    // The kept game type inherits the duplicates' activity: folding an active
    // duplicate into an archived target would otherwise hide the result.
    if (!kept.active && merged.some((gt) => gt.active)) {
      this.gameTypeRepository.save({ ...kept, active: true })
    }

    for (const duplicate of merged) this.gameTypeRepository.hardDelete(duplicate.id)
  }

  private matchesOf(gameTypeIds: ReadonlySet<string>) {
    return this.matchRepository.getAll().filter((match) => gameTypeIds.has(match.gameTypeId))
  }
}
