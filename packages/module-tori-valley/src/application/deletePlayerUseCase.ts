import type { PlayerRepository } from '../domain/port/playerRepository'

export class DeletePlayerUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  invoke(id: string, anonymize = false): void {
    this.repository.delete(id, anonymize)
  }
}
