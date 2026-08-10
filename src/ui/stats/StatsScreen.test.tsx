import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetHeadToHeadUseCase } from '../../application/getHeadToHeadUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { StatsScreen } from './StatsScreen'

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

function renderStats() {
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
  const getHeadToHead = new GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo)
  const getGameTypes = new GetGameTypesUseCase(gameTypeRepo)
  return render(<StatsScreen getHeadToHead={getHeadToHead} getGameTypes={getGameTypes} />)
}

describe('StatsScreen', () => {
  it('shows the empty message when there are no matches', () => {
    const getHeadToHead = new GetHeadToHeadUseCase(
      new InMemoryMatchRepository(),
      new InMemoryGameTypeRepository(),
      new InMemoryPlayerRepository(),
    )
    const getGameTypes = new GetGameTypesUseCase(new InMemoryGameTypeRepository())
    render(<StatsScreen getHeadToHead={getHeadToHead} getGameTypes={getGameTypes} />)

    expect(screen.getByText('No stats yet — play some matches first.')).toBeInTheDocument()
  })

  it('renders the leaderboard with record, elo, and percentage', () => {
    renderStats()

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getAllByText('1W 1L')).toHaveLength(2)
    expect(screen.getAllByText('All')).toHaveLength(1)
    expect(screen.getByText('Type A')).toBeInTheDocument()
    expect(screen.getByText('Type B')).toBeInTheDocument()
  })

  it('wraps the leaderboard rows in a list-container', () => {
    renderStats()

    expect(screen.getByText('Alice').closest('.list-container')).not.toBeNull()
  })

  it('filtering by game type narrows the leaderboard to that game', () => {
    renderStats()

    fireEvent.click(screen.getByText('Type A'))

    expect(screen.getByText('1W 0L')).toBeInTheDocument()
  })

  it('selecting a player shows their detail view with head-to-head', () => {
    renderStats()

    fireEvent.click(screen.getByText('Alice'))

    expect(screen.getByText('Head-to-head')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('1 - 1')).toBeInTheDocument()
  })

  it('notifies onBackOverrideChange when a selection is made and cleared', () => {
    const overrides: (() => void | null)[] = []
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const getHeadToHead = new GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo)
    const getGameTypes = new GetGameTypesUseCase(gameTypeRepo)

    render(
      <StatsScreen
        getHeadToHead={getHeadToHead}
        getGameTypes={getGameTypes}
        onBackOverrideChange={(override) => overrides.push(override as () => void)}
      />,
    )

    expect(overrides.at(-1)).toBeNull()

    fireEvent.click(screen.getByText('Alice'))
    expect(overrides.at(-1)).toBeTypeOf('function')

    act(() => {
      overrides.at(-1)?.()
    })
  })
})
