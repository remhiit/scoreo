import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'

export class UpdateGameTypeUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(gameType: GameType): void {
    // Rounds won only makes sense when the app decides who wins each round.
    const scoringMode = gameType.winCondition === 'MANUAL' ? 'POINTS' : gameType.scoringMode
    this.repository.save(scoringMode === gameType.scoringMode ? gameType : { ...gameType, scoringMode })
  }
}
