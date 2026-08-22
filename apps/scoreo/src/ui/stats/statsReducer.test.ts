import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetHeadToHeadUseCase } from '../../application/getHeadToHeadUseCase'
import { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { loadStats, statsReducer } from './statsReducer'
import { initialStatsState, selectedPlayer } from './statsTypes'

function player(id: string, name: string): Player {
  return { id, name, active: true }
}

function gameType(id: string, name: string): GameType {
  return {
    id,
    name,
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
  }
}

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores']): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null }
}

function buildUseCases(
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
) {
  return {
    getHeadToHead: new GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo),
    getGameTypes: new GetGameTypesUseCase(gameTypeRepo),
    getTrophies: new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo),
  }
}

describe('statsReducer', () => {
  it('initial state has empty leaderboard', () => {
    expect(initialStatsState.leaderboard).toEqual([])
    expect(initialStatsState.selectedPlayerId).toBeUndefined()
  })

  it('loadStats populates the leaderboard', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const { getHeadToHead, getGameTypes, getTrophies } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const { leaderboard } = loadStats(getHeadToHead, getGameTypes, getTrophies, undefined)

    expect(leaderboard).toHaveLength(2)
  })

  it('selectPlayer sets selectedPlayerId', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const { getHeadToHead, getGameTypes, getTrophies } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)
    const load = loadStats(getHeadToHead, getGameTypes, getTrophies, undefined)
    let state = statsReducer(initialStatsState, { type: 'loaded', ...load })

    state = statsReducer(state, { type: 'selectPlayer', playerId: 'p1' })

    expect(state.selectedPlayerId).toBe('p1')
    expect(selectedPlayer(state)).toBeDefined()
  })

  it('leaderboard is sorted by elo', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    matchRepo.save(match('m2', 2000, 'gt1', [
      { playerId: 'p1', score: 8 },
      { playerId: 'p2', score: 12 },
    ]))
    const { getHeadToHead, getGameTypes, getTrophies } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const { leaderboard } = loadStats(getHeadToHead, getGameTypes, getTrophies, undefined)

    expect(leaderboard).toHaveLength(2)
    expect(leaderboard[0].name).toBe('Bob')
    expect(leaderboard[0].elo).toBeGreaterThan(leaderboard[leaderboard.length - 1].elo)
  })

  it('backToLeaderboard clears selectedPlayerId', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const { getHeadToHead, getGameTypes, getTrophies } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)
    const load = loadStats(getHeadToHead, getGameTypes, getTrophies, undefined)
    let state = statsReducer(initialStatsState, { type: 'loaded', ...load })

    state = statsReducer(state, { type: 'selectPlayer', playerId: 'p1' })
    state = statsReducer(state, { type: 'backToLeaderboard' })

    expect(state.selectedPlayerId).toBeUndefined()
    expect(selectedPlayer(state)).toBeUndefined()
  })

  it('selectGameType filters the leaderboard and reloads gameTypes', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Type A'))
    gameTypeRepo.save(gameType('gt2', 'Type B'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    matchRepo.save(match('m2', 2000, 'gt2', [
      { playerId: 'p1', score: 3 },
      { playerId: 'p2', score: 10 },
    ]))
    const { getHeadToHead, getGameTypes, getTrophies } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)
    const initialLoad = loadStats(getHeadToHead, getGameTypes, getTrophies, undefined)
    let state = statsReducer(initialStatsState, { type: 'loaded', ...initialLoad })

    expect(state.gameTypes).toHaveLength(2)
    expect(state.leaderboard).toHaveLength(2)

    state = statsReducer(state, { type: 'selectGameType', gameTypeId: 'gt1' })
    const gt1Load = loadStats(getHeadToHead, getGameTypes, getTrophies, state.selectedGameTypeId)
    state = statsReducer(state, { type: 'loaded', ...gt1Load })

    expect(state.selectedGameTypeId).toBe('gt1')
    expect(state.leaderboard).toHaveLength(2)
    expect(state.leaderboard.find((p) => p.playerId === 'p1')?.elo).toBe(1216)
    expect(state.leaderboard.find((p) => p.playerId === 'p2')?.elo).toBe(1184)

    state = statsReducer(state, { type: 'selectGameType', gameTypeId: 'gt2' })
    const gt2Load = loadStats(getHeadToHead, getGameTypes, getTrophies, state.selectedGameTypeId)
    state = statsReducer(state, { type: 'loaded', ...gt2Load })

    expect(state.selectedGameTypeId).toBe('gt2')
    expect(state.leaderboard.find((p) => p.playerId === 'p1')?.elo).toBe(1184)
    expect(state.leaderboard.find((p) => p.playerId === 'p2')?.elo).toBe(1216)

    state = statsReducer(state, { type: 'selectGameType', gameTypeId: undefined })

    expect(state.selectedGameTypeId).toBeUndefined()
  })
})
