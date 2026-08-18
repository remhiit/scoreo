import type { ObjectifCardSelection } from '../../domain/model/landscape'

export type Screen =
  | { type: 'Home'; selectedPlayerIds?: string[] }
  | { type: 'History' }
  | { type: 'MatchSetup'; playerIds: string[]; matchId?: string }
  | {
      type: 'ScoreDetail'
      playerIds: string[]
      matchId?: string
      objectifCards?: ObjectifCardSelection
    }

export const HOME_SCREEN: Screen = { type: 'Home' }
export const HISTORY_SCREEN: Screen = { type: 'History' }

/** Home, optionally carrying a player preselection to restore (e.g. on back from setup). */
export function homeScreen(selectedPlayerIds?: string[]): Screen {
  return selectedPlayerIds === undefined ? HOME_SCREEN : { type: 'Home', selectedPlayerIds }
}

export function matchSetupScreen(playerIds: string[], matchId?: string): Screen {
  return { type: 'MatchSetup', playerIds, matchId }
}

export function scoreDetailScreen(
  playerIds: string[],
  matchId?: string,
  objectifCards?: ObjectifCardSelection,
): Screen {
  return { type: 'ScoreDetail', playerIds, matchId, objectifCards }
}
