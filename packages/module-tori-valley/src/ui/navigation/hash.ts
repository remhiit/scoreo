import { HISTORY_SCREEN, HOME_SCREEN, scoreDetailScreen, type Screen } from './screen'

/** Parses a hash fragment (without leading #) into a Screen. */
export function parseHash(hash: string): Screen {
  const parts = hash
    .replace(/^\/+/, '')
    .split('/')
    .filter((part) => part.length > 0)
  const first = parts[0]
  switch (first) {
    case 'history':
      return HISTORY_SCREEN
    case 'score': {
      if (parts.length < 2) return HOME_SCREEN
      const playersCsv = parts[1]
      const matchId = parts[2]
      const playerIds = playersCsv.split(',').filter((id) => id.length > 0)
      return scoreDetailScreen(playerIds, matchId)
    }
    default:
      return HOME_SCREEN
  }
}

/** Converts a Screen into a hash URL (with leading #). */
export function screenToHash(screen: Screen): string {
  switch (screen.type) {
    case 'Home':
      return '#/'
    case 'History':
      return '#/history'
    case 'ScoreDetail': {
      const route = `#/score/${screen.playerIds.join(',')}`
      return screen.matchId !== undefined ? `${route}/${screen.matchId}` : route
    }
  }
}
