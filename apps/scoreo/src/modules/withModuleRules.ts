import type { ScoringModuleManifest } from '@scoreboards/module-api'
import type { GameType } from '../domain/model/gameType'
import { findManifest } from './registry'

/**
 * The rules of a game bound to a module, read from the module's manifest instead
 * of from what the game type stored: `winCondition`, the player range, points
 * scoring and `MANUAL_SELECTION` (the module decides its own tie-breaks, which
 * reach the match as `manualWinners`).
 *
 * Pure, and applied on read only — nothing stored is rewritten. A game without
 * a `moduleId`, or whose module is no longer registered, is returned as is
 * (same reference): it keeps the rules it stored.
 *
 * `manifest` defaults to the registry's lookup; tests inject their own.
 */
export function withModuleRules(
  gameType: GameType,
  manifest: ScoringModuleManifest | undefined = gameType.moduleId === null
    ? undefined
    : findManifest(gameType.moduleId),
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
