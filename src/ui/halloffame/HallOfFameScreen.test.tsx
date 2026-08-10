import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { HallOfFameScreen } from './HallOfFameScreen'

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

function renderHallOfFame() {
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
  const getTrophies = new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo)
  const getGameTypes = new GetGameTypesUseCase(gameTypeRepo)
  return render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)
}

describe('HallOfFameScreen', () => {
  it('shows one card per trophy with title, description, and holder', () => {
    renderHallOfFame()

    expect(screen.getByText('The Invincible')).toBeInTheDocument()
    expect(screen.getByText('Current Streak')).toBeInTheDocument()
    expect(screen.getByText('Streak Breaker')).toBeInTheDocument()
    expect(screen.getByText('Longest winning streak of all time')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument() // The Invincible: Alice's 2-win streak
    expect(screen.getAllByText('Bob')).toHaveLength(2) // Current Streak + Streak Breaker holder
  })

  it('shows an explicit empty state when a trophy has no holders', () => {
    const getTrophies = new GetTrophiesUseCase(
      new InMemoryMatchRepository(),
      new InMemoryGameTypeRepository(),
      new InMemoryPlayerRepository(),
    )
    const getGameTypes = new GetGameTypesUseCase(new InMemoryGameTypeRepository())
    render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)

    expect(screen.getAllByText('No record yet.')).toHaveLength(3)
  })

  it('filters trophies by game type', () => {
    renderHallOfFame()

    expect(screen.getByText('Chess')).toBeInTheDocument()
    expect(screen.getByText('Darts')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Darts'))

    // On gt2 only, Bob's the one with the (single-match) streak.
    expect(screen.getAllByText('Bob')).toHaveLength(2)
  })

  it('defaults to the "All" filter', () => {
    renderHallOfFame()

    expect(screen.getByText('All').className).toContain('active')
  })
})
