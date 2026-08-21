import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'

export class GetGameTypesUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(includeInactive = false): GameType[] {
    return this.repository.getAll(includeInactive)
  }
}
