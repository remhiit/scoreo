import { describe, expect, it } from 'vitest'
import { parseHash, screenToHash } from './hash'
import { scoreDetailScreen, type Screen } from './screen'

describe('parseHash', () => {
  it('empty hash returns Home', () => {
    expect(parseHash('')).toEqual({ type: 'Home' })
  })

  it('root slash returns Home', () => {
    expect(parseHash('/')).toEqual({ type: 'Home' })
  })

  it('history route returns History', () => {
    expect(parseHash('history')).toEqual({ type: 'History' })
  })

  it('stats route returns Stats', () => {
    expect(parseHash('stats')).toEqual({ type: 'Stats' })
  })

  it('import route returns Import', () => {
    expect(parseHash('import')).toEqual({ type: 'Import' })
  })

  it('games route returns Games', () => {
    expect(parseHash('games')).toEqual({ type: 'Games' })
  })

  it('sync route returns Sync', () => {
    expect(parseHash('sync')).toEqual({ type: 'Sync' })
  })

  it('hall-of-fame route returns HallOfFame', () => {
    expect(parseHash('hall-of-fame')).toEqual({ type: 'HallOfFame' })
  })

  it('scoreDetail new match, single player', () => {
    const detail = parseHash('score/gt1/alice') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.gameTypeId).toBe('gt1')
    expect(detail.playerIds).toEqual(['alice'])
    expect(detail.matchId).toBeUndefined()
  })

  it('scoreDetail new match, multiple players CSV', () => {
    const detail = parseHash('score/gt1/alice,bob,charlie') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.gameTypeId).toBe('gt1')
    expect(detail.playerIds).toEqual(['alice', 'bob', 'charlie'])
    expect(detail.matchId).toBeUndefined()
  })

  it('scoreDetail existing match', () => {
    const detail = parseHash('score/gt2/alice,bob/match123') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.gameTypeId).toBe('gt2')
    expect(detail.playerIds).toEqual(['alice', 'bob'])
    expect(detail.matchId).toBe('match123')
  })

  it('scoreDetail missing playerIds falls back to Home', () => {
    expect(parseHash('score/gt1')).toEqual({ type: 'Home' })
  })

  it('scoreDetail empty gameTypeId falls back to Home', () => {
    expect(parseHash('score//alice')).toEqual({ type: 'Home' })
  })

  it('unknown route falls back to Home', () => {
    expect(parseHash('unknown')).toEqual({ type: 'Home' })
  })

  it('extra slashes are ignored', () => {
    expect(parseHash('///history///')).toEqual({ type: 'History' })
  })
})

describe('screenToHash', () => {
  it('Home produces root hash', () => {
    expect(screenToHash({ type: 'Home' })).toBe('#/')
  })

  it('History produces correct hash', () => {
    expect(screenToHash({ type: 'History' })).toBe('#/history')
  })

  it('Stats produces correct hash', () => {
    expect(screenToHash({ type: 'Stats' })).toBe('#/stats')
  })

  it('Import produces correct hash', () => {
    expect(screenToHash({ type: 'Import' })).toBe('#/import')
  })

  it('Games produces correct hash', () => {
    expect(screenToHash({ type: 'Games' })).toBe('#/games')
  })

  it('Sync produces correct hash', () => {
    expect(screenToHash({ type: 'Sync' })).toBe('#/sync')
  })

  it('HallOfFame produces correct hash', () => {
    expect(screenToHash({ type: 'HallOfFame' })).toBe('#/hall-of-fame')
  })

  it('scoreDetail new match, single player', () => {
    expect(screenToHash(scoreDetailScreen('gt1', ['alice']))).toBe('#/score/gt1/alice')
  })

  it('scoreDetail new match, multiple players CSV', () => {
    expect(screenToHash(scoreDetailScreen('gt1', ['alice', 'bob', 'charlie']))).toBe('#/score/gt1/alice,bob,charlie')
  })

  it('scoreDetail existing match', () => {
    expect(screenToHash(scoreDetailScreen('gt2', ['alice', 'bob'], 'match123'))).toBe('#/score/gt2/alice,bob/match123')
  })

  it('scoreDetail empty players', () => {
    expect(screenToHash(scoreDetailScreen('gt1', []))).toBe('#/score/gt1/')
  })
})

describe('roundtrip (screenToHash -> parseHash)', () => {
  it('Home is idempotent', () => {
    const original: Screen = { type: 'Home' }
    expect(parseHash(screenToHash(original).replace(/^#/, ''))).toEqual(original)
  })

  it('History is idempotent', () => {
    const original: Screen = { type: 'History' }
    expect(parseHash(screenToHash(original).replace(/^#/, ''))).toEqual(original)
  })

  it('scoreDetail new match is idempotent', () => {
    const original = scoreDetailScreen('gt1', ['alice', 'bob'])
    expect(parseHash(screenToHash(original).replace(/^#/, ''))).toEqual(original)
  })

  it('scoreDetail existing match is idempotent', () => {
    const original = scoreDetailScreen('gt2', ['alice', 'bob', 'charlie'], 'match456')
    expect(parseHash(screenToHash(original).replace(/^#/, ''))).toEqual(original)
  })

  it('all screen types are idempotent', () => {
    const screens: Screen[] = [
      { type: 'Home' },
      { type: 'History' },
      { type: 'Stats' },
      { type: 'Import' },
      { type: 'Games' },
      { type: 'Sync' },
      { type: 'HallOfFame' },
      scoreDetailScreen('gt1', ['p1']),
      scoreDetailScreen('gt2', ['p1', 'p2', 'p3'], 'm123'),
    ]

    for (const screen of screens) {
      const hash = screenToHash(screen)
      const restored = parseHash(hash.replace(/^#/, ''))
      expect(restored).toEqual(screen)
    }
  })
})

describe('edge cases & robustness', () => {
  it('gameTypeId with special chars is preserved', () => {
    const detail = parseHash('score/game-type_1/alice') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.gameTypeId).toBe('game-type_1')
  })

  it('playerId with special chars is preserved', () => {
    const detail = parseHash('score/gt1/player_1,player-2') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.playerIds).toEqual(['player_1', 'player-2'])
  })

  it('matchId with special chars is preserved', () => {
    const detail = parseHash('score/gt1/alice/match_123-abc') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.matchId).toBe('match_123-abc')
  })

  it('playerId list with empty strings is filtered', () => {
    const detail = parseHash('score/gt1/alice,,bob') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.playerIds).toEqual(['alice', 'bob'])
  })

  it('scoreDetail with extra segments ignores extra segments', () => {
    const detail = parseHash('score/gt1/alice/match123/extra/segments') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.gameTypeId).toBe('gt1')
    expect(detail.playerIds).toEqual(['alice'])
    expect(detail.matchId).toBe('match123')
  })

  it('multiple playerIds produce correct CSV', () => {
    expect(screenToHash(scoreDetailScreen('gt1', ['alice', 'bob', 'charlie', 'diana']))).toBe(
      '#/score/gt1/alice,bob,charlie,diana',
    )
  })

  it('single player CSV has no trailing comma', () => {
    const hash = screenToHash(scoreDetailScreen('gt1', ['alice']))
    expect(hash.endsWith(',')).toBe(false)
  })
})

describe('navigation scenarios (happy paths)', () => {
  it('home to history', () => {
    expect(screenToHash({ type: 'Home' })).toBe('#/')
    expect(screenToHash({ type: 'History' })).toBe('#/history')
  })

  it('home to scoreDetail to home', () => {
    expect(screenToHash({ type: 'Home' })).toBe('#/')
    expect(screenToHash(scoreDetailScreen('gt1', ['alice', 'bob']))).toBe('#/score/gt1/alice,bob')
    expect(screenToHash({ type: 'Home' })).toBe('#/')
  })

  it('create match flow: Home -> Games -> ScoreDetail (new) -> ScoreDetail (with matchId)', () => {
    expect(screenToHash({ type: 'Home' })).toBe('#/')
    expect(screenToHash({ type: 'Games' })).toBe('#/games')
    expect(screenToHash(scoreDetailScreen('gt1', ['alice', 'bob']))).toBe('#/score/gt1/alice,bob')
    expect(screenToHash(scoreDetailScreen('gt1', ['alice', 'bob'], 'match123'))).toBe(
      '#/score/gt1/alice,bob/match123',
    )
  })

  it('import and stats', () => {
    expect(screenToHash({ type: 'Import' })).toBe('#/import')
    expect(screenToHash({ type: 'Stats' })).toBe('#/stats')
    expect(screenToHash({ type: 'Home' })).toBe('#/')
  })
})

describe('backward compatibility & schema evolution', () => {
  it('old-style home hash ("/") is recognized', () => {
    expect(parseHash('/')).toEqual({ type: 'Home' })
  })

  it('scoreDetail without matchId is still valid', () => {
    const detail = parseHash('score/gt1/alice,bob') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.matchId).toBeUndefined()
  })

  it('scoreDetail with matchId (newer feature) is valid', () => {
    const detail = parseHash('score/gt1/alice,bob/match999') as Extract<Screen, { type: 'ScoreDetail' }>
    expect(detail.matchId).toBe('match999')
  })
})

describe('module score route', () => {
  it('parses a new module match', () => {
    expect(parseHash('/module/tori-valley/gt1/p1,p2')).toEqual({
      type: 'ModuleScore',
      moduleId: 'tori-valley',
      gameTypeId: 'gt1',
      playerIds: ['p1', 'p2'],
      matchId: undefined,
    })
  })

  it('parses a module match being reopened', () => {
    expect(parseHash('/module/tori-valley/gt1/p1,p2/m9')).toEqual({
      type: 'ModuleScore',
      moduleId: 'tori-valley',
      gameTypeId: 'gt1',
      playerIds: ['p1', 'p2'],
      matchId: 'm9',
    })
  })

  it('falls back to Home when the route is incomplete', () => {
    expect(parseHash('/module/tori-valley/gt1')).toEqual({ type: 'Home' })
  })

  it('renders a new module match', () => {
    expect(
      screenToHash({
        type: 'ModuleScore',
        moduleId: 'tori-valley',
        gameTypeId: 'gt1',
        playerIds: ['p1', 'p2'],
      }),
    ).toBe('#/module/tori-valley/gt1/p1,p2')
  })

  it('renders a module match being reopened', () => {
    expect(
      screenToHash({
        type: 'ModuleScore',
        moduleId: 'tori-valley',
        gameTypeId: 'gt1',
        playerIds: ['p1'],
        matchId: 'm9',
      }),
    ).toBe('#/module/tori-valley/gt1/p1/m9')
  })

  it('round-trips', () => {
    const hash = '#/module/tori-valley/gt1/p1,p2/m9'
    expect(screenToHash(parseHash(hash.slice(1)))).toBe(hash)
  })
})
