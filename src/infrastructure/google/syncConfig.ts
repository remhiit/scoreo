import { z } from 'zod'

const KEY = 'scoreo_sync_config'

const SyncConfigSchema = z.object({
  email: z.string().default(''),
  lastSyncTimestamp: z.number().default(0),
  lastSyncFileId: z.string().default(''),
})

export type SyncConfig = z.infer<typeof SyncConfigSchema>

function defaultConfig(): SyncConfig {
  return SyncConfigSchema.parse({})
}

/**
 * The OAuth access token used to live here in plaintext (`accessToken`/`expiresAt` fields,
 * see issue #51) — it's now kept in memory only (GoogleAuthService). Any leftover legacy
 * fields from a pre-fix localStorage entry are dropped by the schema parse below and the
 * cleaned value is written back immediately, purging the stale plaintext token.
 */
export function loadSyncConfig(): SyncConfig {
  const raw = localStorage.getItem(KEY)
  if (!raw) return defaultConfig()
  try {
    const parsed: unknown = JSON.parse(raw)
    const config = SyncConfigSchema.parse(parsed)
    const hasLegacyFields = typeof parsed === 'object' && parsed !== null && ('accessToken' in parsed || 'expiresAt' in parsed)
    if (hasLegacyFields) saveSyncConfig(config)
    return config
  } catch {
    return defaultConfig()
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config))
}

export function clearSyncConfig(): void {
  localStorage.removeItem(KEY)
}
