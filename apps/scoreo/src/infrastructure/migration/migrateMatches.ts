import { isUuid } from '../../application/idGenerator'

type RawRecord = Record<string, unknown>

/** Parses a strict "YYYY-MM-DD" date (as produced by v1 exports) to epoch ms at UTC midnight. */
function tryParseIsoDateToEpochMs(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const epochMs = Date.UTC(year, month - 1, day)
  const check = new Date(epochMs)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null
  }
  return epochMs
}

/**
 * Migrates a raw JSON array of matches (v1 -> v2): string ISO dates become epoch-ms
 * numbers, and non-UUID ids are replaced. Returns null if nothing needed migrating
 * (callers should skip writing back in that case) — idempotent.
 */
export function migrateMatches(rawJson: string, generateId: () => string): string | null {
  let elements: unknown
  try {
    elements = JSON.parse(rawJson)
  } catch {
    return null
  }
  if (!Array.isArray(elements)) return null

  let changed = false
  const migrated = elements.map((element: unknown) => {
    if (typeof element !== 'object' || element === null) return element
    const obj = element as RawRecord
    const next: RawRecord = { ...obj }
    let objChanged = false

    if (typeof obj.date === 'string') {
      const epochMs = tryParseIsoDateToEpochMs(obj.date)
      if (epochMs !== null) {
        next.date = epochMs
        objChanged = true
      }
    }

    if (typeof obj.id === 'string' && !isUuid(obj.id)) {
      next.id = generateId()
      objChanged = true
    }

    if (objChanged) {
      changed = true
      return next
    }
    return element
  })

  if (!changed) return null
  return JSON.stringify(migrated)
}
