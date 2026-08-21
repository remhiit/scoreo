import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'

export class UpdateGameTypeUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(gameType: GameType): void {
    this.repository.save(gameType)
  }
}
