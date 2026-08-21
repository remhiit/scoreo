import { newId } from '../../application/idGenerator'
import type { Match } from '../../domain/model/match'
import { MatchSchema } from '../../domain/model/match.schema'
import type { DataChangeNotifier } from '../../domain/port/dataChangeNotifier'
import type { MatchRepository } from '../../domain/port/matchRepository'
import { migrateMatches } from '../migration/migrateMatches'

const KEY = 'scoreo_matches'

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
  private migrated = false

  constructor(private readonly notifier?: DataChangeNotifier) {}

  getAll(): Match[] {
    if (!this.migrated) {
      this.migrateIfNeeded()
      this.migrated = true
    }
    return readAll()
  }

  save(match: Match): void {
    const updated = this.getAll()
    const idx = updated.findIndex((m) => m.id === match.id)
    if (idx >= 0) updated[idx] = match
    else updated.push(match)
    writeAll(updated)
    this.notifier?.notifyChanged()
  }

  saveAll(matches: Match[]): void {
    const existing = this.getAll()
    for (const match of matches) {
      const idx = existing.findIndex((m) => m.id === match.id)
      if (idx >= 0) existing[idx] = match
      else existing.push(match)
    }
    writeAll(existing)
    this.notifier?.notifyChanged()
  }

  findById(id: string): Match | undefined {
    return this.getAll().find((m) => m.id === id)
  }

  delete(id: string): void {
    writeAll(this.getAll().filter((m) => m.id !== id))
    this.notifier?.notifyChanged()
  }

  deleteAll(): void {
    writeAll([])
    this.notifier?.notifyChanged()
  }

  private migrateIfNeeded(): void {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return
    const migrated = migrateMatches(raw, newId)
    if (migrated === null) return
    localStorage.setItem(KEY, migrated)
  }
}
