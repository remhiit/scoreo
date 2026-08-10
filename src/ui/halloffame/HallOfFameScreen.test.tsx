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
    expect(screen.getByText('The Collector')).toBeInTheDocument()
    expect(screen.getByText('The Regular')).toBeInTheDocument()
    expect(screen.getByText('The Peak')).toBeInTheDocument()
    expect(screen.getByText('King of the Hill')).toBeInTheDocument()
    expect(screen.getByText('Game Record')).toBeInTheDocument()
    expect(screen.getByText('Nemesis')).toBeInTheDocument()
    expect(screen.getByText('Player of the Month')).toBeInTheDocument()
    expect(screen.getByText('Longest winning streak of all time')).toBeInTheDocument()
    // Alice: The Invincible (2-win streak) + The Collector (2 wins) + The Peak + King of the Hill + Game Record (Chess, 10).
    expect(screen.getAllByText('Alice')).toHaveLength(5)
    // Bob: Current Streak + Streak Breaker holder + Game Record (Darts, 10).
    expect(screen.getAllByText('Bob')).toHaveLength(3)
  })

  it('shows an explicit empty state when a trophy has no holders', () => {
    const getTrophies = new GetTrophiesUseCase(
      new InMemoryMatchRepository(),
      new InMemoryGameTypeRepository(),
      new InMemoryPlayerRepository(),
    )
    const getGameTypes = new GetGameTypesUseCase(new InMemoryGameTypeRepository())
    render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)

    expect(screen.getAllByText('No record yet.')).toHaveLength(10)
  })

  it('filters trophies by game type', () => {
    renderHallOfFame()

    expect(screen.getByRole('button', { name: 'Chess' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Darts' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Darts' }))

    // On gt2 only, Bob holds The Invincible, Current Streak, The Collector, The Peak, King of the Hill, and Game Record.
    expect(screen.getAllByText('Bob')).toHaveLength(6)
  })

  it('defaults to the "All" filter', () => {
    renderHallOfFame()

    expect(screen.getByText('All').className).toContain('active')
  })
})
