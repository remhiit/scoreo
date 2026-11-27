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

  /**
   * The game this match is scored for, already carrying the manifest's rules
   * (`winCondition`, player range, `POINTS`, `MANUAL_SELECTION`) whatever the
   * stored game type says.
   */
  readonly gameType: GameType

  /**
   * Persists the match and returns the id of the created or updated one.
   * Throws, writing nothing and keeping the draft, when the host's domain
   * invariant (`assertMatchConsistent`) refuses it. On success it clears the
   * draft slot if that slot holds this module's game.
   */
  saveMatch(match: ModuleMatch): string

  /**
   * A scoring session in progress, so a reload does not lose it. The host has
   * one draft slot for every game, generic or module: starting any game
   * replaces the draft of another. A module's state is stored opaquely in that
   * slot, tagged with its `moduleId` and game type.
   *
   * This is not a convenience: 1000 Sabords is a game engine, not a score
   * sheet — it carries live turn state (dice, events) that must survive a
   * refresh.
   *
   * Returns the state only when the slot holds this module's game for this
   * game type, `undefined` otherwise.
   */
  loadDraft(): unknown | undefined
  /**
   * Replaces the draft slot with this module's state. Not called while
   * `editing` is set: the match is already saved, and the slot belongs to the
   * new game that may be in progress.
   */
  saveDraft(state: unknown): void
  /** Empties the draft slot if it holds this module's game; same `editing` rule as `saveDraft`. */
  clearDraft(): void
}
