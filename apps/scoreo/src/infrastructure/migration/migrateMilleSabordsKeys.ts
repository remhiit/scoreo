/**
 * The keys the standalone 1kSaBord app wrote, in its own order of importance.
 *
 * They carry no prefix at all, and that is the whole problem: GitHub Pages
 * serves every one of these apps from a single origin (`remhiit.github.io`),
 * and `localStorage` is per origin, not per path. `theme` is a name any app on
 * that origin could claim; `partie` and `historique_parties` are barely better.
 * Scoreo prefixes everything it writes with `scoreo_`, so the collision has
 * never bitten — but the neighbourhood stays polluted until someone tidies it.
 *
 * Same reasoning as the service worker's `CACHE_PREFIX` sweep, one storey down.
 */
const MILLE_SABORDS_KEYS = ['partie', 'joueurs_connus', 'historique_parties', 'theme'] as const

const PREFIX = 'sabords_'

/**
 * Moves 1kSaBord's unprefixed keys under `sabords_`, once, and returns how many
 * moved.
 *
 * Idempotent: a second run finds nothing left to move and writes nothing. A key
 * whose target already holds a *different* value is left exactly where it is — a
 * stale source is worth less than the risk of overwriting the newer value under
 * the prefix, and nothing here is allowed to destroy data. When the two match,
 * the source is a half-finished move (the write landed, the removal did not) and
 * gets cleaned up.
 *
 * The data is *moved*, not read: Scoreo never interprets it. Recovering an old
 * history means exporting it from the 1kSaBord app and importing the JSON here.
 *
 * Storage can throw outright (Safari in private mode, a full quota), and a
 * cleanup is never worth a blank page, so every access is guarded.
 */
export function migrateMilleSabordsKeys(storage: Storage): number {
  let moved = 0

  for (const key of MILLE_SABORDS_KEYS) {
    try {
      const value = storage.getItem(key)
      if (value === null) continue

      const existing = storage.getItem(PREFIX + key)
      if (existing !== null && existing !== value) continue

      if (existing === null) storage.setItem(PREFIX + key, value)
      storage.removeItem(key)
      moved += 1
    } catch {
      // A key that could not be moved is left as it was: the next start retries.
      continue
    }
  }

  return moved
}
