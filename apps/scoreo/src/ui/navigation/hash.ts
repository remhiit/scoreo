import { moduleScoreScreen, type Screen, scoreDetailScreen } from './screen'

/**
 * Parses a hash fragment (without leading #) into a Screen.
 * Ported from AppNavigator.kt's restoreFromHash(); shared with useHashRouter
 * so routing logic and its tests exercise the exact same code (the Kotlin
 * original duplicated this logic privately inside its own test file).
 */
export function parseHash(hash: string): Screen {
  const parts = hash.replace(/^\/+/, '').split('/').filter((part) => part.length > 0)
  const first = parts[0]
  switch (first) {
    case 'history':
      return { type: 'History' }
    case 'stats':
      return { type: 'Stats' }
    case 'import':
      return { type: 'Import' }
    case 'games':
      return { type: 'Games' }
    case 'sync':
      return { type: 'Sync' }
    case 'hall-of-fame':
      return { type: 'HallOfFame' }
    case 'module':
      // #/module/<moduleId>/<gameTypeId>/<ids>[/<matchId>]
      if (parts.length >= 4) {
        const playerIds = parts[3].split(',').filter((id) => id.length > 0)
        return moduleScoreScreen(parts[1], parts[2], playerIds, parts[4])
      }
      return { type: 'Home' }
    case 'score':
      if (parts.length >= 3) {
        const gameTypeId = parts[1]
        const playersCsv = parts[2]
        const matchId = parts[3]
        const playerIds = playersCsv.split(',').filter((id) => id.length > 0)
        return scoreDetailScreen(gameTypeId, playerIds, matchId)
      }
      return { type: 'Home' }
    default:
      return { type: 'Home' }
  }
}

/** Converts a Screen into a hash URL (with leading #). Ported from AppNavigator.kt's toHash(). */
export function screenToHash(screen: Screen): string {
  switch (screen.type) {
    case 'Home':
      return '#/'
    case 'History':
      return '#/history'
    case 'Stats':
      return '#/stats'
    case 'Import':
      return '#/import'
    case 'Games':
      return '#/games'
    case 'Sync':
      return '#/sync'
    case 'HallOfFame':
      return '#/hall-of-fame'
    case 'ScoreDetail': {
      const route = `#/score/${screen.gameTypeId}/${screen.playerIds.join(',')}`
      return screen.matchId !== undefined ? `${route}/${screen.matchId}` : route
    }
    case 'ModuleScore': {
      const route = `#/module/${screen.moduleId}/${screen.gameTypeId}/${screen.playerIds.join(',')}`
      return screen.matchId !== undefined ? `${route}/${screen.matchId}` : route
    }
  }
}
