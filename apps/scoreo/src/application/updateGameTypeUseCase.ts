import type { ScoringModuleManifest } from '@scoreboards/module-api'
import {
  applyModuleRules,
  assertValidPlayerRange,
  effectiveScoringMode,
  roundScoringChanged,
  type GameType,
} from '../domain/model/gameType'
import { ValidationError } from '../domain/model/errors'
import { rescoreMatch, type Match } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

const MODULE_RULE_FIELDS = ['winCondition', 'scoringMode', 'tieBreakRule', 'minPlayers', 'maxPlayers'] as const

export class UpdateGameTypeUseCase {
  /**
   * `findManifest` looks a module up by its id — the host's registry in the
   * app, a test's own manifests otherwise — so this use case never depends on
   * which modules are installed. It returns `undefined` for a module no longer
   * registered.
   */
  constructor(
    private readonly repository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
    private readonly findManifest: (moduleId: string) => ScoringModuleManifest | undefined,
  ) {}

  /**
   * Throws a `ValidationError` before saving anything when a rule of a game
   * bound to a registered module is changed (see `assertModuleRulesUntouched`),
   * or when the player range is invalid (a bound under 1, or a minimum above the maximum).
   *
   * Saves the game type, with its effective scoring mode (`POINTS` for a
   * `MANUAL` or module-bound game). When the change alters how rounds turn into
   * a final score (`roundScoringChanged`: effective scoring mode, or who wins a
   * round in rounds-won mode), every match of this game is rescored
   * (`rescoreMatch`): one whose round detail agrees with its stored scores is
   * recomputed from that detail; one without detail whose points now turn into
   * rounds won becomes a single round holding its stored scores, then is scored
   * from it. A module-bound game always scores in points, so its matches are
   * never recomputed into rounds won. Matches whose detail disagrees with their
   * scores keep their stored scores. Tie-break data (`manualWinners`,
   * `secondaryPlayerScores`) is never touched.
   *
   * The rescored matches are written before the game type: if that write fails
   * (storage quota), the game keeps its former rules, matching its matches.
   * If `save(updated)` then fails, the rescored matches are written back as
   * they were read (`saveAll` of the original matches, only those rescored)
   * and the `save` error is rethrown unchanged. Known limit: when that
   * compensating write fails too (quota still full), the `save` error is still
   * the one rethrown, and the matches may stay rescored under the new rules
   * while the game keeps its former ones.
   */
  invoke(gameType: GameType): void {
    this.assertModuleRulesUntouched(gameType)
    assertValidPlayerRange(gameType)
    const scoringMode = effectiveScoringMode(gameType)
    const updated = scoringMode === gameType.scoringMode ? gameType : { ...gameType, scoringMode }
    const previous = this.repository.findById(updated.id)
    let originals: Match[] = []
    if (previous && roundScoringChanged(previous, updated)) {
      const recomputed = this.recomputeMatches(previous, updated)
      if (recomputed.length > 0) {
        this.matchRepository.saveAll(recomputed.map(({ rescored }) => rescored))
        originals = recomputed.map(({ original }) => original)
      }
    }
    try {
      this.repository.save(updated)
    } catch (error) {
      if (originals.length > 0) this.restoreMatches(originals)
      throw error
    }
  }

  /** Best effort: a failure here is swallowed, the caller rethrows the original one. */
  private restoreMatches(originals: Match[]): void {
    try {
      this.matchRepository.saveAll(originals)
    } catch {
      // Known limit (see `invoke`): the matches may stay rescored.
    }
  }

  /**
   * The rules of a game bound to a registered module belong to its manifest:
   * any change to them throws a `ValidationError`, nothing written. Name and
   * archiving stay editable. Rules already equal to the manifest's pass.
   */
  private assertModuleRulesUntouched(gameType: GameType): void {
    if (gameType.moduleId === null) return
    const resolved = applyModuleRules(gameType, this.findManifest(gameType.moduleId))
    if (resolved === gameType) return
    for (const field of MODULE_RULE_FIELDS) {
      if (gameType[field] !== resolved[field]) {
        throw new ValidationError(field, 'The rules of a game with a module come from the module')
      }
    }
  }

  private recomputeMatches(
    previous: GameType,
    updated: GameType,
  ): { original: Match; rescored: Match }[] {
    const recomputed: { original: Match; rescored: Match }[] = []
    for (const match of this.matchRepository.getAll()) {
      if (match.gameTypeId !== updated.id) continue
      const rescored = rescoreMatch(match, previous, updated)
      if (rescored !== match) recomputed.push({ original: match, rescored })
    }
    return recomputed
  }
}
