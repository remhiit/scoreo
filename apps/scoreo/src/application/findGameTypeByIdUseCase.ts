import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'

export class FindGameTypeByIdUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(gameTypeId: string): GameType | undefined {
    return this.repository.findById(gameTypeId)
  }
}
