import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreateMatchUseCase } from '../../application/createMatchUseCase'
import { UpdateMatchUseCase } from '../../application/updateMatchUseCase'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { buildInitialState } from './scoreDetailReducer'
import { ScoreDetailScreen } from './ScoreDetailScreen'

const players = [
  { id: 'p1', name: 'Alice', active: true },
  { id: 'p2', name: 'Bob', active: true },
]

function renderScreen(matchRepository = new InMemoryMatchRepository()) {
  const createMatch = new CreateMatchUseCase(matchRepository)
  const updateMatch = new UpdateMatchUseCase(matchRepository)
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  const initialState = buildInitialState(players, { type: 'Create' })

  render(
    <ScoreDetailScreen
      initialState={initialState}
      createMatch={createMatch}
      updateMatch={updateMatch}
      currentDate={() => 1000}
      onSaved={onSaved}
      onCancel={onCancel}
    />,
  )

  return { matchRepository, onSaved, onCancel }
}

describe('ScoreDetailScreen', () => {
  it('renders a card per player with a zero total', () => {
    renderScreen()
    expect(screen.getByText('Alice — 0 VP')).toBeInTheDocument()
    expect(screen.getByText('Bob — 0 VP')).toBeInTheDocument()
  })

  it('updates the live total when a Torī count changes', () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('Alice red Torī count'), { target: { value: '1' } })
    expect(screen.getByText('Alice — 0 VP')).toBeInTheDocument() // a single Torī scores 0 VP
    fireEvent.change(screen.getByLabelText('Alice green Torī count'), { target: { value: '1' } })
    expect(screen.getByText('Alice — 2 VP')).toBeInTheDocument() // 2 distinct colors → 2 VP
  })

  it('saves a new match and calls onSaved', () => {
    const { matchRepository, onSaved } = renderScreen()
    fireEvent.click(screen.getByText('Save match'))
    expect(matchRepository.getAll()).toHaveLength(1)
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('calls onCancel without saving', () => {
    const { matchRepository, onCancel } = renderScreen()
    fireEvent.click(screen.getByText('Cancel'))
    expect(matchRepository.getAll()).toHaveLength(0)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('only one player can hold the Pinceau at a time', () => {
    renderScreen()
    const select = screen.getByLabelText('Pinceau holder (+2 VP)')
    fireEvent.change(select, { target: { value: 'p1' } })
    expect(screen.getByText('Alice — 2 VP')).toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'p2' } })
    expect(screen.getByText('Alice — 0 VP')).toBeInTheDocument()
    expect(screen.getByText('Bob — 2 VP')).toBeInTheDocument()
  })
})
