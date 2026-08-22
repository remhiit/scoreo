import type { ModuleMatchResult, ModulePlayer } from './matchResult'

/**
 * Everything a module is allowed to do to the host application, injected into
 * the module screen. A module has no repository, no storage key and no
 * knowledge of the host's models: it asks for players and hands back results.
 */
export interface ModuleHost {
  /**
   * Every player the host knows, retired ones included: a module reopening an
   * old match still needs the names of the people who played it.
   */
  getPlayers(): readonly ModulePlayer[]

  /** Persists the result and returns the id of the created or updated match. */
  saveMatch(result: ModuleMatchResult): string

  /**
   * A scoring session in progress, so a reload does not lose it. Namespaced by
   * `moduleId`, so two modules never overwrite each other's draft.
   *
   * This is not a convenience: 1000 Sabords is a game engine, not a score
   * sheet — it carries live turn state (dice, events) that must survive a
   * refresh, and the host's own single anonymous match draft cannot hold it.
   */
  loadDraft(): unknown | undefined
  saveDraft(state: unknown): void
  clearDraft(): void
}
