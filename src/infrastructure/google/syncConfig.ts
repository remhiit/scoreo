import { z } from 'zod'

const KEY = 'scoreo_sync_config'

const SyncConfigSchema = z.object({
  accessToken: z.string().default(''),
  email: z.string().default(''),
  lastSyncTimestamp: z.number().default(0),
  lastSyncFileId: z.string().default(''),
  expiresAt: z.number().default(0),
})

export type SyncConfig = z.infer<typeof SyncConfigSchema>

function defaultConfig(): SyncConfig {
  return SyncConfigSchema.parse({})
}

export function loadSyncConfig(): SyncConfig {
  const raw = localStorage.getItem(KEY)
  if (!raw) return defaultConfig()
  try {
    return SyncConfigSchema.parse(JSON.parse(raw))
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
