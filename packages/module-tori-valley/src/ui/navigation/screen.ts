export type Screen =
  | { type: 'Home' }
  | { type: 'History' }
  | { type: 'ScoreDetail'; playerIds: string[]; matchId?: string }

export const HOME_SCREEN: Screen = { type: 'Home' }
export const HISTORY_SCREEN: Screen = { type: 'History' }

export function scoreDetailScreen(playerIds: string[], matchId?: string): Screen {
  return { type: 'ScoreDetail', playerIds, matchId }
}
