import type { GameType, Player } from '@scoreboards/shared-domain'
import type { ModuleMatch } from './match'

/**
 * Everything a module is allowed to do to the host application, injected into
 * the module screen. A module has no repository and no storage key: it asks for
 * players and hands back the match it scored, in Scoreo's own types.
 */
export interface ModuleHost {
  /**
   * Every player the host knows, retired ones included: a module reopening an
   * old match still needs the names of the people who played it.
   */
  getPlayers(): readonly Player[]

  /** The game this match is scored for. */
  readonly gameType: GameType

  /**
   * Persists the match and returns the id of the created or updated one.
   * Throws, writing nothing, when the host's domain invariant refuses it.
   */
  saveMatch(match: ModuleMatch): string

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
