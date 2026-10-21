import { effectiveScoringMode, roundScoringChanged, type GameType } from '../domain/model/gameType'
import { rescoreMatch, type Match } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

export class UpdateGameTypeUseCase {
  constructor(
    private readonly repository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  /**
   * Saves the game type, with its effective scoring mode (`POINTS` for a
   * `MANUAL` or module-bound game). When the change alters how rounds turn into
   * a final score (`roundScoringChanged`: effective scoring mode, or who wins a
   * round in rounds-won mode), every match of this game whose round detail
   * agrees with its stored scores is recomputed from that detail and rewritten
   * (`rescoreMatch`). A module-bound game always scores in points, so its
   * matches are never recomputed into rounds won. Matches without detail, or
   * whose detail disagrees with their scores, keep their stored scores.
   * Tie-break data (`manualWinners`, `secondaryPlayerScores`) is never touched.
   */
  invoke(gameType: GameType): void {
    const scoringMode = effectiveScoringMode(gameType)
    const updated = scoringMode === gameType.scoringMode ? gameType : { ...gameType, scoringMode }
    const previous = this.repository.findById(updated.id)
    this.repository.save(updated)
    if (previous && roundScoringChanged(previous, updated)) this.recomputeMatches(previous, updated)
  }

  private recomputeMatches(previous: GameType, updated: GameType): void {
    const recomputed: Match[] = []
    for (const match of this.matchRepository.getAll()) {
      if (match.gameTypeId !== updated.id) continue
      const rescored = rescoreMatch(match, previous, updated)
      if (rescored !== match) recomputed.push(rescored)
    }
    if (recomputed.length > 0) this.matchRepository.saveAll(recomputed)
  }
}
