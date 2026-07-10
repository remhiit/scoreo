import { PlayerSchema } from '../../domain/model/player.schema'
import type { Player } from '../../domain/model/player'
import type { PlayerRepository } from '../../domain/port/playerRepository'

const KEY = 'scoreo_players'

const PlayersSchema = PlayerSchema.array()

function readAll(): Player[] {
  const raw = localStorage.getItem(KEY)
  if (raw === null) return []
  try {
    return PlayersSchema.parse(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeAll(players: Player[]): void {
  localStorage.setItem(KEY, JSON.stringify(players))
}

export class LocalStoragePlayerRepository implements PlayerRepository {
  getAll(includeInactive = false): Player[] {
    const all = readAll()
    return includeInactive ? all : all.filter((p) => p.active)
  }

  save(player: Player): void {
    const updated = readAll()
    const idx = updated.findIndex((p) => p.id === player.id)
    if (idx >= 0) updated[idx] = player
    else updated.push(player)
    writeAll(updated)
  }

  saveAll(players: Player[]): void {
    const existing = readAll()
    for (const player of players) {
      const idx = existing.findIndex((p) => p.id === player.id)
      if (idx >= 0) existing[idx] = player
      else existing.push(player)
    }
    writeAll(existing)
  }

  delete(id: string, anonymize = false): void {
    const updated = readAll().map((player) =>
      player.id === id ? { ...player, active: false, name: anonymize ? '' : player.name } : player,
    )
    writeAll(updated)
  }
}
