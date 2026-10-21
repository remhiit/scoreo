import { effectiveScoringMode, usesRoundsWon, type GameType } from '../domain/model/gameType'
import { roundDetailStatus, scoresFromRounds, type Match } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

/** True when `before` and `after` derive a different final score from the same rounds. */
function roundScoringChanged(before: GameType, after: GameType): boolean {
  if (usesRoundsWon(before) !== usesRoundsWon(after)) return true
  // Who wins a round depends on the win condition; a points sum does not.
  return usesRoundsWon(after) && before.winCondition !== after.winCondition
}

export class UpdateGameTypeUseCase {
  constructor(
    private readonly repository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  /**
   * Saves the game type. When the change alters how rounds turn into a final
   * score (scoring mode, or who wins a round in rounds-won mode), every match of
   * this game whose round detail agrees with its stored scores is recomputed
   * from that detail and rewritten — module-bound games included, since a
   * game's rules apply to its whole history. Matches without detail, or whose
   * detail disagrees with their scores, keep their stored scores. Tie-break data
   * (`manualWinners`, `secondaryPlayerScores`) is never touched.
   */
  invoke(gameType: GameType): void {
    const scoringMode = effectiveScoringMode(gameType.winCondition, gameType.scoringMode)
    const updated = scoringMode === gameType.scoringMode ? gameType : { ...gameType, scoringMode }
    const previous = this.repository.findById(updated.id)
    this.repository.save(updated)
    if (previous && roundScoringChanged(previous, updated)) this.recomputeMatches(previous, updated)
  }

  private recomputeMatches(previous: GameType, updated: GameType): void {
    const recomputed: Match[] = []
    for (const match of this.matchRepository.getAll()) {
      if (match.gameTypeId !== updated.id) continue
      if (roundDetailStatus(match, previous.winCondition) !== 'consistent') continue
      const playerScores = scoresFromRounds(
        updated,
        match.rounds,
        match.playerScores.map((ps) => ps.playerId),
      )
      const unchanged = playerScores.every((ps, i) => ps.score === match.playerScores[i].score)
      if (!unchanged) recomputed.push({ ...match, playerScores })
    }
    if (recomputed.length > 0) this.matchRepository.saveAll(recomputed)
  }
}
