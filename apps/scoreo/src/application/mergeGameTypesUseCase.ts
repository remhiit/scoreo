import { assertMatchConsistent } from '@scoreboards/shared-domain'
import { NotFoundError, ValidationError } from '../domain/model/errors'
import { usesRoundsWon, type GameType } from '../domain/model/gameType'
import { rescoreMatch, type Match } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

export interface MergeGameTypesPreview {
  /** Matches played under one of the duplicates — how many would be moved. */
  affectedMatches: number
  /**
   * At least one duplicate doesn't score like the game type being kept. Not a
   * blocker — the kept game type's rules simply become the ones applied to the
   * moved matches (rescored by `rescoreMatch` when the scoring differs) — but the
   * winners of those matches can change, so the UI warns about it.
   */
  rulesDiffer: boolean
}

/**
 * Field of the `ValidationError` thrown when a merge would mix a module's game
 * with matches or a module that doesn't fit its rules; the Games screen shows a
 * translated label for it.
 */
export const MERGE_MODULE_RULES_FIELD = 'moduleRules'

/**
 * Into an ordinary game, a module's match keeps the scores the module returned:
 * merging never rescores it (#590). (Into a module's game it is rescored like
 * any other, and must then be consistent.)
 */
function isFromModule(match: Match, source: GameType | undefined): boolean {
  return source?.moduleId != null || match.moduleData !== null
}

/** `tieBreakCondition` only matters under SECONDARY_SCORE; comparing it otherwise flags a difference nothing acts on. */
function sameScoringRules(a: GameType, b: GameType): boolean {
  if (a.winCondition !== b.winCondition) return false
  if (usesRoundsWon(a) !== usesRoundsWon(b)) return false
  if (a.tieBreakRule !== b.tieBreakRule) return false
  if (a.tieBreakRule !== 'SECONDARY_SCORE') return true
  return a.tieBreakCondition === b.tieBreakCondition
}

/**
 * Folds one or more duplicate game types into the one to keep: every match moves
 * to the kept game type (rescored by `rescoreMatch` when the duplicate scored
 * rounds differently, a module's matches excepted), then each duplicate is
 * hard-deleted.
 *
 * Two guards keep a module's game coherent, both refusing with a
 * `ValidationError` before anything is written: a duplicate bound to a module
 * can only be folded into a game bound to the same module, and when the kept
 * game is bound to a module every moved match must pass `assertMatchConsistent`
 * under its (resolved) rules — a rounds-won match without round detail, which
 * can't be turned back into points, is refused.
 * Archiving isn't enough — it only hides a duplicate, leaving its matches under a
 * separate game and splitting History's filter, per-game trophies and the game
 * record apart.
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
    const matches = this.matchesOf(duplicates)
    if (kept === undefined) return { affectedMatches: matches.length, rulesDiffer: false }
    return {
      affectedMatches: matches.length,
      rulesDiffer: merged.some((gt) => gt !== undefined && !sameScoringRules(gt, kept)),
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

    // A module's game only takes its own module's duplicates: any other
    // history would be read under rules it was not played with.
    if (merged.some((gt) => gt.moduleId !== null && gt.moduleId !== kept.moduleId)) {
      throw new ValidationError(
        MERGE_MODULE_RULES_FIELD,
        'A game bound to a module can only be merged into a game bound to the same module',
      )
    }

    // A game's rules apply to its whole history: a moved match whose duplicate
    // turned rounds into a final score differently (scoring mode, or who wins a
    // round in rounds won) is rescored as a scoring mode change would
    // (`UpdateGameTypeUseCase`, `rescoreMatch`). Into an ordinary game, a
    // module's matches keep the scores the module returned (#590).
    const duplicateById = new Map(merged.map((gt) => [gt.id, gt]))
    const intoModule = kept.moduleId !== null
    const moved = this.matchesOf(duplicates).map((match) => {
      const source = duplicateById.get(match.gameTypeId)
      const rescored =
        source && (intoModule || !isFromModule(match, source))
          ? rescoreMatch(match, source, kept)
          : match
      if (intoModule) {
        try {
          // `assertMatchConsistent` accepts a match without round detail, but a
          // rounds-won count can't be read as points: without rounds to
          // convert it from, it can't be moved.
          if (source && usesRoundsWon(source) && rescored.rounds.length === 0) {
            throw new Error('Rounds won without round detail cannot be converted to points')
          }
          assertMatchConsistent(rescored, kept)
        } catch (e) {
          throw new ValidationError(
            MERGE_MODULE_RULES_FIELD,
            `Match ${match.id} does not fit the rules of the module game: ${
              e instanceof Error ? e.message : String(e)
            }`,
          )
        }
      }
      return { ...rescored, gameTypeId: keptId }
    })
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
