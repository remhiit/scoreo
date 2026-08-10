import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { hallOfFameReducer, loadHallOfFame } from './hallOfFameReducer'
import { initialHallOfFameState } from './hallOfFameTypes'

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
    active: true,
  }
}

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores']): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [] }
}

function buildUseCases(
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
) {
  return {
    getTrophies: new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo),
    getGameTypes: new GetGameTypesUseCase(gameTypeRepo),
  }
}

describe('hallOfFameReducer', () => {
  it('initial state has no trophies and no filter', () => {
    expect(initialHallOfFameState.trophies).toEqual([])
    expect(initialHallOfFameState.selectedGameTypeId).toBeUndefined()
  })

  it('loadHallOfFame populates trophies and game types', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Chess'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    const { getTrophies, getGameTypes } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const { trophies, gameTypes } = loadHallOfFame(getTrophies, getGameTypes, undefined)

    expect(trophies).toHaveLength(8)
    expect(gameTypes).toHaveLength(1)
  })

  it('selectGameType sets selectedGameTypeId', () => {
    let state = hallOfFameReducer(initialHallOfFameState, { type: 'selectGameType', gameTypeId: 'gt1' })

    expect(state.selectedGameTypeId).toBe('gt1')

    state = hallOfFameReducer(state, { type: 'selectGameType', gameTypeId: undefined })

    expect(state.selectedGameTypeId).toBeUndefined()
  })

  it('selectGameType filters the trophies to that game type only', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Chess'))
    gameTypeRepo.save(gameType('gt2', 'Darts'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    matchRepo.save(match('m3', 3000, 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
    const { getTrophies, getGameTypes } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)
    const initialLoad = loadHallOfFame(getTrophies, getGameTypes, undefined)
    let state = hallOfFameReducer(initialHallOfFameState, { type: 'loaded', ...initialLoad })

    state = hallOfFameReducer(state, { type: 'selectGameType', gameTypeId: 'gt2' })
    const gt2Load = loadHallOfFame(getTrophies, getGameTypes, state.selectedGameTypeId)
    state = hallOfFameReducer(state, { type: 'loaded', ...gt2Load })

    const invincible = state.trophies.find((t) => t.id === 'a1')
    expect(invincible?.holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 1 }])
  })
})
