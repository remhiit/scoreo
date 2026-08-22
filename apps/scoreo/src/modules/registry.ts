import type { ScoringModule, ScoringModuleManifest } from '@scoreboards/module-api'
import { toriValleyModule } from '@scoreboards/module-tori-valley'

/**
 * The only file in Scoreo that names a scoring module.
 *
 * Manifests are eager on purpose — the host reads them to offer the modules —
 * so a manifest must stay a plain object with no imports of its own. The screen
 * behind each module is loaded on demand, which is what keeps a module nobody
 * opens at zero bytes.
 *
 * Removing a module: delete its package, its import here, and its entry below,
 * then `pnpm install`.
 */
export const MODULES: readonly ScoringModule[] = [toriValleyModule]

/**
 * The manifests alone, which is all most of the app needs. They are plain
 * objects: reading one costs nothing, opening a module's screen is what pulls
 * in its chunk.
 */
export const MODULE_MANIFESTS: readonly ScoringModuleManifest[] = MODULES.map((m) => m.manifest)

export function findModule(moduleId: string): ScoringModule | undefined {
  return MODULES.find((m) => m.manifest.moduleId === moduleId)
}

export function findManifest(moduleId: string): ScoringModuleManifest | undefined {
  return MODULE_MANIFESTS.find((m) => m.moduleId === moduleId)
}

/**
 * The module claiming `name` as one of its game names, matched case-insensitively.
 * Only ever consulted the first time a game and a module meet: afterwards the
 * binding lives on `GameType.moduleId` and the name is free to change.
 */
export function findManifestByGameName(name: string): ScoringModuleManifest | undefined {
  const needle = name.trim().toLowerCase()
  return MODULE_MANIFESTS.find((m) => m.gameNames.some((n) => n.toLowerCase() === needle))
}
