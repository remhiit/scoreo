import {
  assertValidPlayerRange,
  effectiveScoringMode,
  type GameType,
} from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import { rescoreGameMatches } from './rescoreGameMatches'

export class UpdateGameTypeUseCase {
  constructor(
    private readonly repository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  /**
   * Throws a `ValidationError` before saving anything when the player range is
   * invalid (a bound under 1, or a minimum above the maximum).
   *
   * Saves the game type, with its effective scoring mode (`POINTS` for a
   * `MANUAL` game). When the change alters how rounds turn into
   * a final score (`roundScoringChanged`: effective scoring mode, or who wins a
   * round in rounds-won mode), every match of this game is rescored
   * (`rescoreMatch`): one whose round detail agrees with its stored scores is
   * recomputed from that detail; one without detail whose points now turn into
   * rounds won becomes a single round holding its stored scores, then is scored
   * from it. Matches whose detail disagrees with their
   * scores keep their stored scores. Tie-break data (`manualWinners`,
   * `secondaryPlayerScores`) is never touched.
   *
   * The rescored matches are written before the game type: if that write fails
   * (storage quota), the game keeps its former rules, matching its matches.
   * The two writes are not atomic, though: if `save(updated)` then fails, the
   * matches are already rescored under the new rules while the game keeps its
   * former ones — silently, as the detail can still look consistent.
   */
  invoke(gameType: GameType): void {
    assertValidPlayerRange(gameType)
    const scoringMode = effectiveScoringMode(gameType)
    const updated = scoringMode === gameType.scoringMode ? gameType : { ...gameType, scoringMode }
    const previous = this.repository.findById(updated.id)
    if (previous) rescoreGameMatches(this.matchRepository, previous, updated)
    this.repository.save(updated)
  }
}
