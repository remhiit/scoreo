import type { GameType } from '../../domain/model/gameType'
import { GameTypeSchema } from '../../domain/model/gameType.schema'
import type { GameTypeRepository } from '../../domain/port/gameTypeRepository'

const KEY = 'scoreo_gametypes'

const GameTypesSchema = GameTypeSchema.array()

function readAll(): GameType[] {
  const raw = localStorage.getItem(KEY)
  if (raw === null) return []
  try {
    return GameTypesSchema.parse(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeAll(gameTypes: GameType[]): void {
  localStorage.setItem(KEY, JSON.stringify(gameTypes))
}

export class LocalStorageGameTypeRepository implements GameTypeRepository {
  getAll(includeInactive = false): GameType[] {
    const all = readAll()
    return includeInactive ? all : all.filter((g) => g.active)
  }

  save(gameType: GameType): void {
    const updated = readAll()
    const idx = updated.findIndex((g) => g.id === gameType.id)
    if (idx >= 0) updated[idx] = gameType
    else updated.push(gameType)
    writeAll(updated)
  }

  saveAll(gameTypes: GameType[]): void {
    const existing = readAll()
    for (const gameType of gameTypes) {
      const idx = existing.findIndex((g) => g.id === gameType.id)
      if (idx >= 0) existing[idx] = gameType
      else existing.push(gameType)
    }
    writeAll(existing)
  }

  findById(id: string): GameType | undefined {
    return readAll().find((g) => g.id === id)
  }
}
