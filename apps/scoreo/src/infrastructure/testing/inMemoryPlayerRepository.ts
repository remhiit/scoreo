import type { Player } from '../../domain/model/player'
import type { PlayerRepository } from '../../domain/port/playerRepository'

export class InMemoryPlayerRepository implements PlayerRepository {
  private players: Player[] = []

  getPlayerCount(): number {
    return this.players.length
  }

  getAllPlayers(): Player[] {
    return [...this.players]
  }

  getAll(includeInactive = false): Player[] {
    return includeInactive ? [...this.players] : this.players.filter((p) => p.active)
  }

  save(player: Player): void {
    const idx = this.players.findIndex((p) => p.id === player.id)
    if (idx >= 0) this.players[idx] = player
    else this.players.push(player)
  }

  saveAll(players: Player[]): void {
    players.forEach((p) => this.save(p))
  }

  delete(id: string, anonymize = false): void {
    const idx = this.players.findIndex((p) => p.id === id)
    if (idx === -1) return
    const existing = this.players[idx]
    this.players[idx] = { ...existing, active: false, name: anonymize ? '' : existing.name }
  }

  hardDelete(id: string): void {
    this.players = this.players.filter((p) => p.id !== id)
  }

  deleteAll(): void {
    this.players = []
  }
}
