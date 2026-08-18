import type { Player } from '../domain/model/player'
import type { PlayerRepository } from '../domain/port/playerRepository'

export class GetPlayersUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  invoke(includeInactive = false): Player[] {
    return this.repository.getAll(includeInactive)
  }
}
