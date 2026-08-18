import { describe, expect, it } from 'vitest'
import { parseHash, screenToHash } from './hash'
import { HISTORY_SCREEN, HOME_SCREEN, scoreDetailScreen } from './screen'

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
})
