import {
  isObjectifVariant,
  LANDSCAPE_TYPES,
  type ObjectifCardSelection,
} from '../../domain/model/landscape'
import {
  HISTORY_SCREEN,
  HOME_SCREEN,
  homeScreen,
  matchSetupScreen,
  scoreDetailScreen,
  type Screen,
} from './screen'

/** Stands in for "no matchId" so the card segment keeps a fixed position. */
const NO_MATCH_ID = '-'

/** One variant letter per landscape, in LANDSCAPE_TYPES order — e.g. "AABCA". */
function encodeCards(cards: ObjectifCardSelection): string {
  return LANDSCAPE_TYPES.map((type) => cards[type]).join('')
}

function decodeCards(encoded: string | undefined): ObjectifCardSelection | undefined {
  if (encoded === undefined || encoded.length !== LANDSCAPE_TYPES.length) return undefined
  const letters = [...encoded]
  if (!letters.every(isObjectifVariant)) return undefined
  return Object.fromEntries(
    LANDSCAPE_TYPES.map((type, i) => [type, letters[i]]),
  ) as ObjectifCardSelection
}

function parseIds(csv: string | undefined): string[] {
  if (csv === undefined) return []
  return csv.split(',').filter((id) => id.length > 0)
}

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
    case 'players': {
      const playerIds = parseIds(parts[1])
      return playerIds.length === 0 ? HOME_SCREEN : homeScreen(playerIds)
    }
    case 'setup': {
      const playerIds = parseIds(parts[1])
      return playerIds.length === 0 ? HOME_SCREEN : matchSetupScreen(playerIds, parts[2])
    }
    case 'score': {
      if (parts.length < 2) return HOME_SCREEN
      const playerIds = parseIds(parts[1])
      const matchId = parts[2] === NO_MATCH_ID ? undefined : parts[2]
      return scoreDetailScreen(playerIds, matchId, decodeCards(parts[3]))
    }
    default:
      return HOME_SCREEN
  }
}

/** Converts a Screen into a hash URL (with leading #). */
export function screenToHash(screen: Screen): string {
  switch (screen.type) {
    case 'Home':
      return screen.selectedPlayerIds !== undefined && screen.selectedPlayerIds.length > 0
        ? `#/players/${screen.selectedPlayerIds.join(',')}`
        : '#/'
    case 'History':
      return '#/history'
    case 'MatchSetup': {
      const route = `#/setup/${screen.playerIds.join(',')}`
      return screen.matchId !== undefined ? `${route}/${screen.matchId}` : route
    }
    case 'ScoreDetail': {
      let route = `#/score/${screen.playerIds.join(',')}`
      if (screen.matchId !== undefined) route += `/${screen.matchId}`
      else if (screen.objectifCards !== undefined) route += `/${NO_MATCH_ID}`
      if (screen.objectifCards !== undefined) route += `/${encodeCards(screen.objectifCards)}`
      return route
    }
  }
}
