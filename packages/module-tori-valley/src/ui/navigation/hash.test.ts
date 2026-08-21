import { describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection } from '../../domain/model/landscape'
import { parseHash, screenToHash } from './hash'
import {
  HISTORY_SCREEN,
  HOME_SCREEN,
  homeScreen,
  matchSetupScreen,
  scoreDetailScreen,
} from './screen'

const CARDS = { ...defaultObjectifCardSelection(), cherryBlossom: 'B', mountain: 'C' } as const

describe('parseHash', () => {
  it('parses an empty hash as Home', () => {
    expect(parseHash('')).toEqual(HOME_SCREEN)
  })

  it('parses /history', () => {
    expect(parseHash('/history')).toEqual(HISTORY_SCREEN)
  })

  it('parses a score route without a matchId', () => {
    expect(parseHash('/score/p1,p2')).toEqual(scoreDetailScreen(['p1', 'p2']))
  })

  it('parses a score route with a matchId', () => {
    expect(parseHash('/score/p1,p2/m1')).toEqual(scoreDetailScreen(['p1', 'p2'], 'm1'))
  })

  it('falls back to Home for an unknown route', () => {
    expect(parseHash('/nope')).toEqual(HOME_SCREEN)
  })

  it('falls back to Home for an incomplete score route', () => {
    expect(parseHash('/score')).toEqual(HOME_SCREEN)
  })

  it('parses a setup route', () => {
    expect(parseHash('/setup/p1,p2')).toEqual(matchSetupScreen(['p1', 'p2']))
  })

  it('falls back to Home for an incomplete setup route', () => {
    expect(parseHash('/setup')).toEqual(HOME_SCREEN)
  })

  it('parses a home route carrying a player preselection', () => {
    expect(parseHash('/players/p1,p2')).toEqual(homeScreen(['p1', 'p2']))
  })

  it('parses a score route carrying the selected cards, with no matchId', () => {
    expect(parseHash('/score/p1,p2/-/AABCA')).toEqual(
      scoreDetailScreen(['p1', 'p2'], undefined, {
        bamboo: 'A',
        cherryBlossom: 'A',
        mountain: 'B',
        water: 'C',
        village: 'A',
      }),
    )
  })

  it('ignores a malformed card segment rather than failing the route', () => {
    expect(parseHash('/score/p1,p2/-/ZZ')).toEqual(scoreDetailScreen(['p1', 'p2']))
  })
})

describe('screenToHash', () => {
  it('round-trips Home', () => {
    expect(parseHash(screenToHash(HOME_SCREEN).slice(1))).toEqual(HOME_SCREEN)
  })

  it('round-trips History', () => {
    expect(parseHash(screenToHash(HISTORY_SCREEN).slice(1))).toEqual(HISTORY_SCREEN)
  })

  it('round-trips ScoreDetail with a matchId', () => {
    const screen = scoreDetailScreen(['p1', 'p2'], 'm1')
    expect(parseHash(screenToHash(screen).slice(1))).toEqual(screen)
  })

  it('round-trips MatchSetup', () => {
    const screen = matchSetupScreen(['p1', 'p2'])
    expect(parseHash(screenToHash(screen).slice(1))).toEqual(screen)
  })

  it('round-trips Home carrying a player preselection', () => {
    const screen = homeScreen(['p1', 'p2'])
    expect(parseHash(screenToHash(screen).slice(1))).toEqual(screen)
  })

  it('round-trips ScoreDetail carrying the selected cards', () => {
    const screen = scoreDetailScreen(['p1', 'p2'], undefined, CARDS)
    expect(parseHash(screenToHash(screen).slice(1))).toEqual(screen)
  })

  it('round-trips ScoreDetail carrying both a matchId and the selected cards', () => {
    const screen = scoreDetailScreen(['p1', 'p2'], 'm1', CARDS)
    expect(parseHash(screenToHash(screen).slice(1))).toEqual(screen)
  })
})
