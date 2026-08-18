import type { Match } from '../../domain/model/match'
import { MatchSchema } from '../../domain/model/match.schema'
import type { MatchRepository } from '../../domain/port/matchRepository'

const KEY = 'tori_valley_matches'

const MatchesSchema = MatchSchema.array()

function readAll(): Match[] {
  const raw = localStorage.getItem(KEY)
  if (raw === null) return []
  try {
    return MatchesSchema.parse(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeAll(matches: Match[]): void {
  localStorage.setItem(KEY, JSON.stringify(matches))
}

export class LocalStorageMatchRepository implements MatchRepository {
  getAll(): Match[] {
    return readAll()
  }

  findById(id: string): Match | undefined {
    return readAll().find((m) => m.id === id)
  }

  save(match: Match): void {
    const updated = readAll()
    const idx = updated.findIndex((m) => m.id === match.id)
    if (idx >= 0) updated[idx] = match
    else updated.push(match)
    writeAll(updated)
  }

  delete(id: string): void {
    writeAll(readAll().filter((m) => m.id !== id))
  }
}
