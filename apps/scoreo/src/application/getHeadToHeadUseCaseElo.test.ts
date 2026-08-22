import { describe, expect, it } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import type { Player } from '../domain/model/player'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { GetHeadToHeadUseCase } from './getHeadToHeadUseCase'

const gt1: GameType = {
  id: 'gt1',
  name: 'HIGHEST',
  winCondition: 'HIGHEST_SCORE',
  tieBreakRule: 'NONE',
  tieBreakCondition: 'HIGHEST_SCORE',
  tieBreakLabel: null,
  moduleId: null,
  active: true,
}
const gt2: GameType = {
  id: 'gt2',
  name: 'LOWEST',
  winCondition: 'LOWEST_SCORE',
  tieBreakRule: 'NONE',
  tieBreakCondition: 'HIGHEST_SCORE',
  tieBreakLabel: null,
  moduleId: null,
  active: true,
}

function players(...pairs: [string, string][]): Player[] {
  return pairs.map(([id, name]) => ({ id, name, active: true }))
}

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores'], overrides: Partial<Match> = {}): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [], ...overrides }
}

function buildUseCase(playerList: Player[], gameTypes: GameType[], matches: Match[]): GetHeadToHeadUseCase {
  const pr = new InMemoryPlayerRepository()
  playerList.forEach((p) => pr.save(p))
  const gtr = new InMemoryGameTypeRepository()
  gameTypes.forEach((gt) => gtr.save(gt))
  const mr = new InMemoryMatchRepository()
  matches.forEach((m) => mr.save(m))
  return new GetHeadToHeadUseCase(mr, gtr, pr)
}

describe('GetHeadToHeadUseCase ELO', () => {
  it('two players one match basic elo', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob']),
      [gt1],
      [match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }])],
    )
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p1')?.elo).toBe(1216)
    expect(result.find((r) => r.playerId === 'p2')?.elo).toBe(1184)
  })

  it('two players two matches elo reverses', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob']),
      [gt1],
      [
        match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]),
        match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 3 }, { playerId: 'p2', score: 8 }]),
      ],
    )
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p2')!.elo).toBeGreaterThan(result.find((r) => r.playerId === 'p1')!.elo)
    expect(result).toHaveLength(2)
  })

  it('three players one winner elo normalized', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob'], ['p3', 'Charlie']),
      [gt1],
      [
        match('m1', 1000, 'gt1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
          { playerId: 'p3', score: 3 },
        ]),
      ],
    )
    const result = useCase.invoke()
    const alice = result.find((r) => r.playerId === 'p1')!
    const bob = result.find((r) => r.playerId === 'p2')!
    const charlie = result.find((r) => r.playerId === 'p3')!

    expect(alice.elo).toBeGreaterThan(1200)
    expect(bob.elo).toBeLessThan(1200)
    expect(charlie.elo).toBeLessThan(1200)
    expect(alice.elo).toBeGreaterThan(bob.elo)
  })

  it('three players two winners', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob'], ['p3', 'Charlie']),
      [gt1],
      [
        match('m1', 1000, 'gt1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 10 },
          { playerId: 'p3', score: 5 },
        ]),
      ],
    )
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p1')?.elo).toBe(1208)
    expect(result.find((r) => r.playerId === 'p2')?.elo).toBe(1208)
    expect(result.find((r) => r.playerId === 'p3')?.elo).toBe(1184)
  })

  it('four players one winner elo normalized', () => {
    const useCase = buildUseCase(
      players(['p1', 'A'], ['p2', 'B'], ['p3', 'C'], ['p4', 'D']),
      [gt1],
      [
        match('m1', 1000, 'gt1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
          { playerId: 'p3', score: 4 },
          { playerId: 'p4', score: 3 },
        ]),
      ],
    )
    const result = useCase.invoke()
    const winner = result.find((r) => r.playerId === 'p1')!
    expect(winner.elo).toBeGreaterThan(1208)
    expect(winner.elo).toBeLessThan(1220)
    result.filter((r) => r.playerId !== 'p1').forEach((r) => expect(r.elo).toBeLessThan(1200))
  })

  it('ex-aequo match elo unchanged', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob']),
      [gt1],
      [match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 10 }])],
    )
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p1')?.elo).toBe(1200)
    expect(result.find((r) => r.playerId === 'p2')?.elo).toBe(1200)
  })

  it('lowest score win condition', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob']),
      [gt2],
      [match('m1', 1000, 'gt2', [{ playerId: 'p1', score: 3 }, { playerId: 'p2', score: 10 }])],
    )
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p1')?.elo).toBe(1216)
    expect(result.find((r) => r.playerId === 'p2')?.elo).toBe(1184)
  })

  it('manual win condition', () => {
    const gt3: GameType = { ...gt1, id: 'gt3', name: 'MANUAL', winCondition: 'MANUAL' }
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob']),
      [gt3],
      [match('m1', 1000, 'gt3', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }], { manualWinners: ['p1'] })],
    )
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p1')?.elo).toBe(1216)
    expect(result.find((r) => r.playerId === 'p2')?.elo).toBe(1184)
  })

  it('players with zero wins and losses excluded from leaderboard', () => {
    const useCase = buildUseCase(
      players(['p1', 'Alice'], ['p2', 'Bob'], ['p3', 'Charlie']),
      [gt1],
      [match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }])],
    )
    const result = useCase.invoke()
    expect(result).toHaveLength(2)
    expect(result.some((r) => r.playerId === 'p3')).toBe(false)
  })

  it('elo floor does not go negative', () => {
    const matches = Array.from({ length: 100 }, (_, i) =>
      match(`m${i}`, i, 'gt1', [
        { playerId: 'p2', score: 10 },
        { playerId: 'p1', score: 0 },
      ]),
    )
    const useCase = buildUseCase(players(['p1', 'Loser'], ['p2', 'Winner']), [gt1], matches)
    const result = useCase.invoke()
    expect(result.find((r) => r.playerId === 'p1')!.elo).toBeGreaterThanOrEqual(0)
  })
})
