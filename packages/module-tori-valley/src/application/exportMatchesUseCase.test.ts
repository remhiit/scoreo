import { describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection } from '../domain/model/landscape'
import { emptyPlayerResult, scorePlayerResult, type Match } from '../domain/model/match'
import type { Player } from '../domain/model/player'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { EXPORT_GAME_NAME, EXPORT_VERSION, ExportMatchesUseCase } from './exportMatchesUseCase'

function player(id: string, name: string, active = true): Player {
  return { id, name, active }
}

function setup(players: Player[], matches: Match[], now = 5000) {
  const playerRepo = new InMemoryPlayerRepository()
  players.forEach((p) => playerRepo.save(p))
  const matchRepo = new InMemoryMatchRepository()
  matches.forEach((m) => matchRepo.save(m))
  return new ExportMatchesUseCase(matchRepo, playerRepo, () => now)
}

const soloMatch: Match = {
  id: 'solo',
  playedAt: 500,
  playerIds: ['p1'],
  objectifCards: defaultObjectifCardSelection(),
  results: [emptyPlayerResult('p1')],
}

/** Alice: 5 (parchemin) + 4 (bamboo) = 9 VP. Bob: 2 (pinceau) + 3 (village) = 5 VP. */
const aliceBeatsBob: Match = {
  id: 'm1',
  playedAt: 1000,
  playerIds: ['p1', 'p2'],
  objectifCards: defaultObjectifCardSelection(),
  results: [
    {
      ...emptyPlayerResult('p1'),
      parcheminValue: 5,
      objectifPoints: { bamboo: 4, cherryBlossom: 0, mountain: 0, water: 0, village: 0 },
    },
    {
      ...emptyPlayerResult('p2'),
      hasPinceau: true,
      objectifPoints: { bamboo: 0, cherryBlossom: 0, mountain: 0, water: 0, village: 3 },
    },
  ],
}

describe('ExportMatchesUseCase', () => {
  it('emits the Scoreo import envelope', () => {
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [aliceBeatsBob])

    const { payload } = useCase.invoke()

    expect(payload.version).toBe(EXPORT_VERSION)
    expect(payload.game).toBe(EXPORT_GAME_NAME)
    expect(payload.winCondition).toBe('HIGHEST_SCORE')
    expect(payload.exportedAt).toBe(5000)
    expect(payload.gameCount).toBe(1)
    expect(payload.games).toHaveLength(1)
  })

  it('carries the match id and date over verbatim so Scoreo can de-duplicate', () => {
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [aliceBeatsBob])

    const [game] = useCase.invoke().payload.games

    expect(game.id).toBe('m1')
    expect(game.date).toBe(1000)
  })

  it('ranks players by descending score', () => {
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [aliceBeatsBob])

    const [game] = useCase.invoke().payload.games

    expect(game.ranking).toEqual([
      { name: 'Alice', score: 9, rank: 1 },
      { name: 'Bob', score: 5, rank: 2 },
    ])
  })

  it('gives rank 1 only to the tie-break winner when totals are equal', () => {
    // Both score 4 VP, but Alice holds 2 Torī against Bob's 1 (rulebook tie-break).
    const tie: Match = {
      id: 'm2',
      playedAt: 2000,
      playerIds: ['p1', 'p2'],
      objectifCards: defaultObjectifCardSelection(),
      results: [
        {
          ...emptyPlayerResult('p1'),
          toriiCounts: { green: 1, red: 1, blue: 0, yellow: 0, purple: 0 },
          objectifPoints: { bamboo: 2, cherryBlossom: 0, mountain: 0, water: 0, village: 0 },
        },
        {
          ...emptyPlayerResult('p2'),
          toriiCounts: { green: 1, red: 0, blue: 0, yellow: 0, purple: 0 },
          objectifPoints: { bamboo: 4, cherryBlossom: 0, mountain: 0, water: 0, village: 0 },
        },
      ],
    }
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [tie])

    const [game] = useCase.invoke().payload.games

    expect(game.ranking).toEqual([
      { name: 'Alice', score: 4, rank: 1 },
      { name: 'Bob', score: 4, rank: 2 },
    ])
  })

  it('breaks the score down into 7 pseudo-rounds: 5 landscapes, Torī, then Parchemin+Pinceau', () => {
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [aliceBeatsBob])

    const [game] = useCase.invoke().payload.games

    expect(game.details).toHaveLength(7)
    expect(game.details[0].scores).toEqual([
      { name: 'Alice', score: 4 },
      { name: 'Bob', score: 0 },
    ]) // bamboo
    expect(game.details[4].scores).toEqual([
      { name: 'Alice', score: 0 },
      { name: 'Bob', score: 3 },
    ]) // village
    expect(game.details[5].scores).toEqual([
      { name: 'Alice', score: 0 },
      { name: 'Bob', score: 0 },
    ]) // torii
    expect(game.details[6].scores).toEqual([
      { name: 'Alice', score: 5 },
      { name: 'Bob', score: 2 },
    ]) // parchemin + pinceau
  })

  it('makes every player round breakdown sum to their ranking score', () => {
    const rich: Match = {
      id: 'm3',
      playedAt: 3000,
      playerIds: ['p1', 'p2'],
      objectifCards: defaultObjectifCardSelection(),
      results: [
        {
          playerId: 'p1',
          toriiCounts: { green: 3, red: 2, blue: 1, yellow: 0, purple: 1 },
          parcheminValue: 4,
          hasPinceau: true,
          objectifPoints: { bamboo: 3, cherryBlossom: 7, mountain: 0, water: 2, village: 5 },
        },
        {
          playerId: 'p2',
          toriiCounts: { green: 1, red: 1, blue: 4, yellow: 2, purple: 0 },
          parcheminValue: 3,
          hasPinceau: false,
          objectifPoints: { bamboo: 6, cherryBlossom: 1, mountain: 4, water: 0, village: 2 },
        },
      ],
    }
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [rich])

    const [game] = useCase.invoke().payload.games

    for (const entry of game.ranking) {
      const sum = game.details.reduce(
        (total, round) => total + (round.scores.find((s) => s.name === entry.name)?.score ?? 0),
        0,
      )
      expect(sum).toBe(entry.score)
    }
    expect(game.ranking.map((e) => e.score)).toEqual(rich.results.map(scorePlayerResult).sort((a, b) => b - a))
  })

  it('leaves solo matches out and reports how many were skipped', () => {
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [soloMatch, aliceBeatsBob])

    const { payload, skippedSoloMatches } = useCase.invoke()

    expect(skippedSoloMatches).toBe(1)
    expect(payload.gameCount).toBe(1)
    expect(payload.games.map((g) => g.id)).toEqual(['m1'])
  })

  it('signals "no exportable match" with an empty games list, which callers must not offer as a file', () => {
    // Scoreo's contract declares `games` with minItems: 1, so this payload is
    // deliberately not importable — HistoryScreen shows a message instead.
    const soloOnly = setup([player('p1', 'Alice')], [soloMatch])

    const { payload, skippedSoloMatches } = soloOnly.invoke()

    expect(payload.games).toEqual([])
    expect(payload.gameCount).toBe(0)
    expect(skippedSoloMatches).toBe(1)

    const emptyHistory = setup([], []).invoke()
    expect(emptyHistory.payload.games).toEqual([])
    expect(emptyHistory.skippedSoloMatches).toBe(0)
  })

  it('sorts matches oldest first', () => {
    const older: Match = { ...aliceBeatsBob, id: 'm0', playedAt: 10 }
    const useCase = setup([player('p1', 'Alice'), player('p2', 'Bob')], [aliceBeatsBob, older])

    const { payload } = useCase.invoke()

    expect(payload.games.map((g) => g.id)).toEqual(['m0', 'm1'])
  })

  it('names anonymized players so Scoreo does not merge them', () => {
    const useCase = setup(
      [player('p1aaaaaa-1111', '', false), player('p2bbbbbb-2222', '', false)],
      [
        {
          ...aliceBeatsBob,
          playerIds: ['p1aaaaaa-1111', 'p2bbbbbb-2222'],
          objectifCards: defaultObjectifCardSelection(),
          results: [
            { ...aliceBeatsBob.results[0], playerId: 'p1aaaaaa-1111' },
            { ...aliceBeatsBob.results[1], playerId: 'p2bbbbbb-2222' },
          ],
        },
      ],
    )

    const [game] = useCase.invoke().payload.games

    expect(game.ranking.map((e) => e.name)).toEqual([
      'Unknown player (p1aaaaaa)',
      'Unknown player (p2bbbbbb)',
    ])
  })

  it('disambiguates two players sharing a name', () => {
    const useCase = setup(
      [player('p1aaaaaa-1111', 'Alice'), player('p2bbbbbb-2222', 'alice')],
      [
        {
          ...aliceBeatsBob,
          playerIds: ['p1aaaaaa-1111', 'p2bbbbbb-2222'],
          objectifCards: defaultObjectifCardSelection(),
          results: [
            { ...aliceBeatsBob.results[0], playerId: 'p1aaaaaa-1111' },
            { ...aliceBeatsBob.results[1], playerId: 'p2bbbbbb-2222' },
          ],
        },
      ],
    )

    const [game] = useCase.invoke().payload.games

    expect(game.ranking.map((e) => e.name)).toEqual(['Alice (p1aaaaaa)', 'alice (p2bbbbbb)'])
  })

  it('falls back to a placeholder name for a result whose player no longer exists', () => {
    const useCase = setup([player('p1', 'Alice')], [aliceBeatsBob])

    const [game] = useCase.invoke().payload.games

    expect(game.ranking.map((e) => e.name)).toEqual(['Alice', 'Unknown player (p2)'])
  })
})
