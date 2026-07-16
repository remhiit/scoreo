import type { Player } from '../model/player'

export interface PlayerRepository {
  getAll(includeInactive?: boolean): Player[]
  save(player: Player): void
  saveAll(players: Player[]): void
  delete(id: string, anonymize?: boolean): void
  hardDelete(id: string): void
  deleteAll(): void
}
