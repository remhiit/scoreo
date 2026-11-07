const PREFIX = 'scoreo_module_draft_'

/**
 * Deletes the per-module drafts (`scoreo_module_draft_<moduleId>`) that the
 * single draft slot (`scoreo_match_draft`) replaced, and returns how many keys
 * went away. Contract phase of the draft migration (#611).
 *
 * Idempotent: with no such key left, it does nothing. Storage can throw outright
 * (Safari in private mode, a full quota), and a cleanup is never worth a blank
 * page, so every access is guarded and failures are silent — the next start
 * retries.
 */
export function removeLegacyModuleDrafts(storage: Storage): number {
  let keys: string[]
  try {
    keys = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key !== null && key.startsWith(PREFIX)) keys.push(key)
    }
  } catch {
    return 0
  }

  let removed = 0
  for (const key of keys) {
    try {
      storage.removeItem(key)
      removed += 1
    } catch {
      continue
    }
  }
  return removed
}
