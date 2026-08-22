/**
 * A scoring session a module has in progress, kept so a page reload does not
 * lose it. Namespaced by `moduleId`, so two modules never overwrite each
 * other's draft — unlike `MatchDraftRepository`, which has a single anonymous
 * slot for Scoreo's own score screen.
 *
 * The payload is opaque: only the module that wrote it knows its shape.
 */
export interface ModuleDraftRepository {
  load(moduleId: string): unknown | undefined
  save(moduleId: string, state: unknown): void
  clear(moduleId: string): void
}
