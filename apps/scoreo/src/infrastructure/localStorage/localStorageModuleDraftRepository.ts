import type { ModuleDraftRepository } from '../../domain/port/moduleDraftRepository'

/** One key per module, so an id is all it takes to keep two modules apart. */
function keyFor(moduleId: string): string {
  return `scoreo_module_draft_${moduleId}`
}

export class LocalStorageModuleDraftRepository implements ModuleDraftRepository {
  load(moduleId: string): unknown | undefined {
    const raw = localStorage.getItem(keyFor(moduleId))
    if (raw === null) return undefined
    try {
      return JSON.parse(raw)
    } catch {
      // A draft is a convenience, never the source of truth: a corrupted one is
      // dropped rather than allowed to break the module's screen.
      localStorage.removeItem(keyFor(moduleId))
      return undefined
    }
  }

  save(moduleId: string, state: unknown): void {
    localStorage.setItem(keyFor(moduleId), JSON.stringify(state))
  }

  clear(moduleId: string): void {
    localStorage.removeItem(keyFor(moduleId))
  }
}
