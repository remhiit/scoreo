import { assertRoundsSumToRanking } from '@scoreboards/module-api'
import { describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection } from './landscape'
import { emptyPlayerResult, scorePlayerResult, type PlayerResult } from './match'
import type { ModuleMatchInput } from './moduleResult'
import {
  DRAFT_VERSION,
  MODULE_DATA_VERSION,
  readDraft,
  SCORE_CATEGORIES,
  toDraft,
  ToriValleyModuleDataSchema,
  toModuleMatchResult,
} from './moduleResult'

function match(results: PlayerResult[], matchId?: string, playedAt?: number): ModuleMatchInput {
  return {
    matchId,
    playedAt,
    playerIds: results.map((r) => r.playerId),
    objectifCards: defaultObjectifCardSelection(),
    results,
  }
}

/** 5 (parchemin) + 4 (bamboo) = 9 VP. */
const alice: PlayerResult = {
  ...emptyPlayerResult('p1'),
  parcheminValue: 5,
  objectifPoints: { bamboo: 4, cherryBlossom: 0, mountain: 0, water: 0, village: 0 },
}

/** 2 (pinceau) + 3 (village) = 5 VP. */
const bob: PlayerResult = {
  ...emptyPlayerResult('p2'),
  hasPinceau: true,
  objectifPoints: { bamboo: 0, cherryBlossom: 0, mountain: 0, water: 0, village: 3 },
}

describe('toModuleMatchResult', () => {
  it('carries a match id when one is given, so saving updates rather than duplicates', () => {
    expect(toModuleMatchResult(match([alice, bob], 'm1')).matchId).toBe('m1')
  })

  // The hosted path leaves both out: the host mints the id and stamps the date.
  it('omits the match id when none is given', () => {
    expect(toModuleMatchResult(match([alice, bob]))).not.toHaveProperty('matchId')
  })

  it('omits the date when none is given', () => {
    expect(toModuleMatchResult(match([alice, bob]))).not.toHaveProperty('playedAt')
  })

  it('carries the date when one is given, as the file export needs', () => {
    expect(toModuleMatchResult(match([alice, bob], 'm1', 4242)).playedAt).toBe(4242)
  })

  it('ranks by score, winner first', () => {
    expect(toModuleMatchResult(match([bob, alice])).ranking).toEqual([
      { playerId: 'p1', score: 9, rank: 1 },
      { playerId: 'p2', score: 5, rank: 2 },
    ])
  })

  it('emits one round per scoring category', () => {
    const rounds = toModuleMatchResult(match([alice, bob])).rounds
    expect(rounds).toHaveLength(SCORE_CATEGORIES.length)
    expect(rounds?.map((r) => r.label)).toEqual([
      'bamboo',
      'cherryBlossom',
      'mountain',
      'water',
      'village',
      'torii',
      'parchemin',
    ])
  })

  it('puts the Pinceau bonus in the parchemin round', () => {
    const rounds = toModuleMatchResult(match([bob])).rounds
    expect(rounds?.at(-1)?.scores).toEqual([{ playerId: 'p2', score: 2 }])
  })

  it('hands the module its own state back verbatim', () => {
    const source = match([alice, bob])
    const result = toModuleMatchResult(source)

    expect(result.moduleData?.version).toBe(MODULE_DATA_VERSION)
    expect(ToriValleyModuleDataSchema.parse(result.moduleData?.data)).toEqual({
      objectifCards: source.objectifCards,
      results: source.results,
    })
  })

  describe('the rounds always sum back to the ranking', () => {
    // This is the invariant Scoreo's import has always enforced, and the reason
    // the categories have to partition `scorePlayerResult` exactly.
    const cases: Record<string, PlayerResult[]> = {
      'a plain two-player match': [alice, bob],
      'a solo match': [alice],
      'a four-player match': [
        alice,
        bob,
        {
          ...emptyPlayerResult('p3'),
          toriiCounts: { green: 3, red: 2, blue: 0, yellow: 0, purple: 0 },
        },
        { ...emptyPlayerResult('p4'), parcheminValue: 4, hasPinceau: true },
      ],
      'everyone at zero': [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
      'a perfect tie': [alice, { ...alice, playerId: 'p2' }],
      'every category scoring at once': [
        {
          ...emptyPlayerResult('p1'),
          parcheminValue: 5,
          hasPinceau: true,
          toriiCounts: { green: 7, red: 5, blue: 3, yellow: 2, purple: 1 },
          objectifPoints: { bamboo: 4, cherryBlossom: 7, mountain: 2, water: 9, village: 3 },
        },
        bob,
      ],
    }

    for (const [name, results] of Object.entries(cases)) {
      it(name, () => {
        expect(() => assertRoundsSumToRanking(toModuleMatchResult(match(results)))).not.toThrow()
      })
    }
  })

  it('agrees with scorePlayerResult on every total', () => {
    const source = match([alice, bob])
    const result = toModuleMatchResult(source)

    for (const entry of result.ranking) {
      const player = source.results.find((r) => r.playerId === entry.playerId)
      expect(entry.score).toBe(scorePlayerResult(player!))
    }
  })
})

describe('readDraft', () => {
  const playerIds = ['p1', 'p2']

  it('reads back a valid draft written for these exact players', () => {
    const draft = toDraft(playerIds, defaultObjectifCardSelection(), [alice, bob])

    expect(readDraft(draft, playerIds)).toEqual({
      objectifCards: defaultObjectifCardSelection(),
      results: [alice, bob],
    })
  })

  it('ignores an unreadable payload', () => {
    expect(readDraft({ nonsense: true }, playerIds)).toBeUndefined()
  })

  it('ignores a payload from an older, incompatible draft shape', () => {
    const olderShape = { ...toDraft(playerIds, defaultObjectifCardSelection(), [alice, bob]) }
    expect(readDraft({ ...olderShape, version: DRAFT_VERSION + 1 }, playerIds)).toBeUndefined()
  })

  it('ignores a draft whose player set differs from the host-provided one', () => {
    const draft = toDraft(['p1', 'p3'], defaultObjectifCardSelection(), [alice])
    expect(readDraft(draft, playerIds)).toBeUndefined()
  })

  it('does not care about player order, only the set', () => {
    const draft = toDraft(['p2', 'p1'], defaultObjectifCardSelection(), [alice, bob])
    expect(readDraft(draft, playerIds)).toBeDefined()
  })
})
