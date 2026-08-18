import type { Player } from '../../domain/model/player'
import type { PlayerRepository } from '../../domain/port/playerRepository'

export class InMemoryPlayerRepository implements PlayerRepository {
  private players: Player[] = []

  getAll(includeInactive = false): Player[] {
    return includeInactive ? [...this.players] : this.players.filter((p) => p.active)
  }

  save(player: Player): void {
    const idx = this.players.findIndex((p) => p.id === player.id)
    if (idx >= 0) this.players[idx] = player
    else this.players.push(player)
  }

  delete(id: string, anonymize = false): void {
    const idx = this.players.findIndex((p) => p.id === id)
    if (idx === -1) return
    const existing = this.players[idx]
    this.players[idx] = { ...existing, active: false, name: anonymize ? '' : existing.name }
  }
}
