import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { emptyPlayerResult } from '../../domain/model/match'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { HistoryScreen } from './HistoryScreen'

function setup() {
  const playerRepo = new InMemoryPlayerRepository()
  playerRepo.save({ id: 'p1', name: 'Alice', active: true })
  playerRepo.save({ id: 'p2', name: 'Bob', active: true })
  const matchRepo = new InMemoryMatchRepository()
  matchRepo.save({
    id: 'm1',
    playedAt: 1000,
    playerIds: ['p1', 'p2'],
    results: [
      { ...emptyPlayerResult('p1'), parcheminValue: 5 },
      { ...emptyPlayerResult('p2'), parcheminValue: 3 },
    ],
  })
  const onEditMatch = vi.fn()

  render(
    <HistoryScreen
      getMatches={new GetMatchesUseCase(matchRepo)}
      getPlayers={new GetPlayersUseCase(playerRepo)}
      deleteMatch={new DeleteMatchUseCase(matchRepo)}
      onEditMatch={onEditMatch}
    />,
  )

  return { matchRepo, onEditMatch }
}

describe('HistoryScreen', () => {
  it('shows an empty state when there are no matches', () => {
    render(
      <HistoryScreen
        getMatches={new GetMatchesUseCase(new InMemoryMatchRepository())}
        getPlayers={new GetPlayersUseCase(new InMemoryPlayerRepository())}
        deleteMatch={new DeleteMatchUseCase(new InMemoryMatchRepository())}
        onEditMatch={vi.fn()}
      />,
    )
    expect(screen.getByText('No matches recorded yet.')).toBeInTheDocument()
  })

  it('lists each player with their score and marks the winner', () => {
    setup()
    expect(screen.getByText('Alice 🏆')).toBeInTheDocument()
    expect(screen.getByText('5 VP')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('3 VP')).toBeInTheDocument()
  })

  it('calls onEditMatch with the match id and player ids', () => {
    const { onEditMatch } = setup()
    fireEvent.click(screen.getByText('Edit'))
    expect(onEditMatch).toHaveBeenCalledWith('m1', ['p1', 'p2'])
  })

  it('deletes a match', () => {
    const { matchRepo } = setup()
    fireEvent.click(screen.getByLabelText('Delete match'))
    expect(matchRepo.getAll()).toHaveLength(0)
    expect(screen.getByText('No matches recorded yet.')).toBeInTheDocument()
  })
})
