import type { Player } from '../model/player'

export interface PlayerRepository {
  getAll(includeInactive?: boolean): Player[]
  save(player: Player): void
  delete(id: string, anonymize?: boolean): void
}
