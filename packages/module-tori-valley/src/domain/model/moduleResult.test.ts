import { assertMatchConsistent, newGameType } from '@scoreboards/shared-domain'
import { describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection } from './landscape'
import {
  emptyPlayerResult,
  scorePlayerResult,
  type Match as DomainMatch,
  type PlayerResult,
} from './match'
import type { ModuleMatchInput } from './moduleResult'
import {
  DRAFT_VERSION,
  MODULE_DATA_VERSION,
  readDraft,
  SCORE_CATEGORIES,
  toDraft,
  ToriValleyModuleDataSchema,
  buildModuleRanking,
  buildModuleRounds,
  toModuleMatch,
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

const GAME_TYPE = newGameType('gt-tori', 'Torī Valley', 'HIGHEST_SCORE', {
  moduleId: 'tori-valley',
})

describe('toModuleMatch', () => {
  it('carries a match id when one is given, so saving updates rather than duplicates', () => {
    expect(toModuleMatch(match([alice, bob], 'm1')).id).toBe('m1')
  })

  // The hosted path leaves both out: the host mints the id and stamps the date.
  it('omits the match id when none is given', () => {
    expect(toModuleMatch(match([alice, bob]))).not.toHaveProperty('id')
  })

  it('omits the date when none is given', () => {
    expect(toModuleMatch(match([alice, bob]))).not.toHaveProperty('date')
  })

  it('carries the date when one is given, as the file export needs', () => {
    expect(toModuleMatch(match([alice, bob], 'm1', 4242)).date).toBe(4242)
  })

  it('scores by total, winner first', () => {
    expect(toModuleMatch(match([bob, alice])).playerScores).toEqual([
      { playerId: 'p1', score: 9 },
      { playerId: 'p2', score: 5 },
    ])
  })

  it('names the winner', () => {
    expect(toModuleMatch(match([bob, alice])).manualWinners).toEqual(['p1'])
  })

  // Several winners when the module itself declares a tie at the first place.
  it('names every player of a tie it cannot break', () => {
    const result = toModuleMatch(match([alice, { ...alice, playerId: 'p2' }]))
    expect(result.manualWinners).toEqual(['p1', 'p2'])
  })

  it('emits one round per scoring category, each scoring every player', () => {
    const rounds = toModuleMatch(match([alice, bob])).rounds
    expect(rounds).toHaveLength(SCORE_CATEGORIES.length)
    expect(rounds.every((round) => round.length === 2)).toBe(true)
  })

  it('puts the Pinceau bonus in the last (parchemin) round', () => {
    const rounds = toModuleMatch(match([bob])).rounds
    expect(rounds.at(-1)).toEqual([{ playerId: 'p2', score: 2 }])
  })

  it('hands the module its own state back verbatim', () => {
    const source = match([alice, bob])
    const result = toModuleMatch(source)

    expect(result.moduleData?.version).toBe(MODULE_DATA_VERSION)
    expect(ToriValleyModuleDataSchema.parse(result.moduleData?.data)).toEqual({
      objectifCards: source.objectifCards,
      results: source.results,
    })
  })

  describe('the rounds always sum back to the scores', () => {
    // This is the invariant the host enforces before storing a match, and the
    // reason the categories have to partition `scorePlayerResult` exactly.
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
        expect(() => assertMatchConsistent(toModuleMatch(match(results)), GAME_TYPE)).not.toThrow()
      })
    }
  })

  it('agrees with scorePlayerResult on every total', () => {
    const source = match([alice, bob])
    const result = toModuleMatch(source)

    for (const entry of result.playerScores) {
      const player = source.results.find((r) => r.playerId === entry.playerId)
      expect(entry.score).toBe(scorePlayerResult(player!))
    }
  })

  // What the host stored before the module wrote `Match` fields itself: the
  // ranking and the rounds went through `rankingToMatch`, which kept the
  // ranking order, took `rank === 1` as the winners and copied the rounds.
  describe('is equivalent to the ranking the host used to translate', () => {
    // Same score, but Pinceau settles it: only p2 wins, p1 ranks second.
    const tiedOnTop: PlayerResult[] = [
      { ...emptyPlayerResult('p1'), parcheminValue: 5 },
      { ...emptyPlayerResult('p2'), parcheminValue: 3, hasPinceau: true },
      emptyPlayerResult('p3'),
    ]
    const corpus: Record<string, PlayerResult[]> = {
      'two players': [bob, alice],
      'a solo match': [alice],
      'a top-score tie settled by the Pinceau': tiedOnTop,
      'a perfect tie': [alice, { ...alice, playerId: 'p2' }],
      'everyone at zero': [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
    }

    for (const [name, results] of Object.entries(corpus)) {
      it(name, () => {
        const source = match(results, 'm1', 4242)
        const reference: DomainMatch = {
          id: 'm1',
          playedAt: 4242,
          playerIds: source.playerIds.slice(),
          objectifCards: source.objectifCards,
          results: source.results,
        }
        const ranking = buildModuleRanking(reference)

        // The tie case really is a tie settled by a rule the host does not know.
        if (name.includes('Pinceau')) {
          expect(ranking.map((e) => [e.playerId, e.rank])).toEqual([
            ['p2', 1],
            ['p1', 2],
            ['p3', 3],
          ])
        }

        expect(toModuleMatch(source)).toEqual({
          id: 'm1',
          date: 4242,
          playerScores: ranking.map((e) => ({ playerId: e.playerId, score: e.score })),
          manualWinners: ranking.filter((e) => e.rank === 1).map((e) => e.playerId),
          rounds: buildModuleRounds(reference),
          moduleData: {
            version: MODULE_DATA_VERSION,
            data: { objectifCards: source.objectifCards, results: source.results },
          },
        })
      })
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
