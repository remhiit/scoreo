export type Screen =
  | { type: 'Home' }
  | { type: 'History' }
  | { type: 'Import' }
  | { type: 'Stats' }
  | { type: 'Games' }
  | { type: 'Sync' }
  | { type: 'HallOfFame' }
  | { type: 'ScoreDetail'; gameTypeId: string; playerIds: string[]; matchId?: string }
  | {
      type: 'ModuleScore'
      moduleId: string
      gameTypeId: string
      playerIds: string[]
      matchId?: string
    }

export const HOME_SCREEN: Screen = { type: 'Home' }
export const HISTORY_SCREEN: Screen = { type: 'History' }
export const IMPORT_SCREEN: Screen = { type: 'Import' }
export const STATS_SCREEN: Screen = { type: 'Stats' }
export const GAMES_SCREEN: Screen = { type: 'Games' }
export const SYNC_SCREEN: Screen = { type: 'Sync' }
export const HALL_OF_FAME_SCREEN: Screen = { type: 'HallOfFame' }

export function scoreDetailScreen(gameTypeId: string, playerIds: string[], matchId?: string): Screen {
  return { type: 'ScoreDetail', gameTypeId, playerIds, matchId }
}

export function moduleScoreScreen(
  moduleId: string,
  gameTypeId: string,
  playerIds: string[],
  matchId?: string,
): Screen {
  return { type: 'ModuleScore', moduleId, gameTypeId, playerIds, matchId }
}
