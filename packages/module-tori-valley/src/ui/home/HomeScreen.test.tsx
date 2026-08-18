import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { HomeScreen } from './HomeScreen'

function renderScreen(repo = new InMemoryPlayerRepository()) {
  const onStartMatch = vi.fn()
  const onViewHistory = vi.fn()
  render(
    <HomeScreen
      addPlayer={new AddPlayerUseCase(repo)}
      getPlayers={new GetPlayersUseCase(repo)}
      deletePlayer={new DeletePlayerUseCase(repo)}
      onStartMatch={onStartMatch}
      onViewHistory={onViewHistory}
    />,
  )
  return { repo, onStartMatch, onViewHistory }
}

describe('HomeScreen', () => {
  it('shows an empty state when there are no players', () => {
    renderScreen()
    expect(screen.getByText('No players yet — add some above.')).toBeInTheDocument()
  })

  it('adds a player through the form', () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('New player name'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('Add'))
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('disables Start match until at least one player is selected', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    renderScreen(repo)

    expect(screen.getByText('Start match')).toBeDisabled()
    fireEvent.click(screen.getByText('Alice'))
    expect(screen.getByText('Start match')).toBeEnabled()
  })

  it('starts a match with the selected player ids', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const { onStartMatch } = renderScreen(repo)

    fireEvent.click(screen.getByText('Alice'))
    fireEvent.click(screen.getByText('Start match'))
    expect(onStartMatch).toHaveBeenCalledWith(['p1'])
  })

  it('deletes a player', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    renderScreen(repo)

    fireEvent.click(screen.getByLabelText('Delete Alice'))
    expect(screen.getByText('No players yet — add some above.')).toBeInTheDocument()
  })

  it('calls onViewHistory', () => {
    const { onViewHistory } = renderScreen()
    fireEvent.click(screen.getByText('View history'))
    expect(onViewHistory).toHaveBeenCalledOnce()
  })
})
