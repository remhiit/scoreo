// See `./player`: this model is shared with every scoring module, so it lives in
// `@scoreboards/shared-domain`, unchanged — the bytes it parses are already on
// users' devices.
import type { ScoringModuleManifest } from '@scoreboards/module-api'
import type { GameType } from '@scoreboards/shared-domain'
import { ValidationError } from './errors'

export {
  computeRoundsWon,
  computeWinners,
  effectiveScoringMode,
  newGameType,
  playerCountFitsRange,
  roundScoringChanged,
  scoringModeIsSelectable,
  usesRoundsWon,
  type GameType,
  type GameTypeDefaults,
  type ScoringModeInputs,
} from '@scoreboards/shared-domain'

/**
 * Throws a `ValidationError` unless each set bound is an integer of at least 1
 * and the minimum does not exceed the maximum (equal bounds are fine: a game
 * with a fixed number of players).
 *
 * Stays in the app rather than in `@scoreboards/shared-domain`: it throws the
 * app's own `ValidationError`, and the errors are not shared with the modules.
 */
export function assertValidPlayerRange(range: Pick<GameType, 'minPlayers' | 'maxPlayers'>): void {
  for (const field of ['minPlayers', 'maxPlayers'] as const) {
    const value = range[field]
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      throw new ValidationError(field, 'Player limits must be whole numbers of at least 1')
    }
  }
  if (
    range.minPlayers !== null &&
    range.maxPlayers !== null &&
    range.minPlayers > range.maxPlayers
  ) {
    throw new ValidationError('minPlayers', 'Minimum players must not exceed maximum players')
  }
}

/**
 * The rules of a game bound to a module, read from that module's `manifest`
 * instead of from what the game type stored: `winCondition`, the player range,
 * points scoring and `MANUAL_SELECTION` (the module decides its own tie-breaks,
 * which reach the match as `manualWinners`).
 *
 * Pure: the caller looks the manifest up (the host's registry, or a test's own).
 * A game without a `moduleId`, or with no `manifest` (its module is no longer
 * registered), is returned as is — same reference: it keeps the rules it stored.
 */
export function applyModuleRules(
  gameType: GameType,
  manifest: ScoringModuleManifest | undefined,
): GameType {
  if (gameType.moduleId === null || manifest === undefined) return gameType
  return {
    ...gameType,
    winCondition: manifest.winCondition,
    minPlayers: manifest.minPlayers,
    maxPlayers: manifest.maxPlayers,
    scoringMode: 'POINTS',
    tieBreakRule: 'MANUAL_SELECTION',
  }
}
