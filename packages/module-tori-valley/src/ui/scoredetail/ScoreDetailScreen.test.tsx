import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildInitialState } from './scoreDetailReducer'
import { ScoreDetailScreen } from './ScoreDetailScreen'

const players = [
  { id: 'p1', name: 'Alice', active: true },
  { id: 'p2', name: 'Bob', active: true },
]

/**
 * The screen is handed a `save` callback and never learns where the match goes:
 * inside Scoreo that callback is `host.saveMatch`. A spy is therefore the whole
 * of what these tests need to observe — and the only thing left to observe since
 * the module stopped owning a repository of its own.
 */
function renderWithCards(cards: Parameters<typeof buildInitialState>[3]) {
  const save = vi.fn()
  render(
    <ScoreDetailScreen
      initialState={buildInitialState(players, { type: 'Create' }, [], cards)}
      save={save}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  )
  return { save }
}

function renderScreen() {
  const save = vi.fn()
  const onSaved = vi.fn()
  const onCancel = vi.fn()

  render(
    <ScoreDetailScreen
      initialState={buildInitialState(players, { type: 'Create' })}
      save={save}
      onSaved={onSaved}
      onCancel={onCancel}
    />,
  )

  return { save, onSaved, onCancel }
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
    const { save, onSaved } = renderScreen()
    fireEvent.click(screen.getByText('Save match'))
    expect(save).toHaveBeenCalledOnce()
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('calls onCancel without saving', () => {
    const { save, onCancel } = renderScreen()
    fireEvent.click(screen.getByText('Cancel'))
    expect(save).not.toHaveBeenCalled()
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

describe('guided Objectif entry', () => {
  const allA = {
    bamboo: 'A',
    cherryBlossom: 'A',
    mountain: 'A',
    water: 'A',
    village: 'A',
  } as const

  it('renders the fields the selected card asks for, not a bare total', () => {
    renderWithCards(allA)

    expect(screen.getByLabelText('Alice — Groups of exactly 2 Bamboo tiles')).toBeInTheDocument()
  })

  it('updates the player total live as counts are entered', () => {
    renderWithCards(allA)

    fireEvent.change(screen.getByLabelText('Alice — Groups of exactly 2 Bamboo tiles'), {
      target: { value: '3' },
    })

    // Bambou A: 3 groups → 15 on the printed table
    expect(screen.getByText('Alice — 15 VP')).toBeInTheDocument()
  })

  it('renders a checkbox for a flag field', () => {
    renderWithCards(allA)

    expect(
      screen.getByLabelText('Alice — That group touches both the top and bottom edges'),
    ).toBeInTheDocument()
  })

  it('swaps to a total field when the manual override is ticked', () => {
    renderWithCards(allA)

    fireEvent.click(screen.getByLabelText('Enter Alice Bamboo total by hand'))

    expect(screen.getByLabelText('Alice Bamboo Objectif points')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Alice — Groups of exactly 2 Bamboo tiles'),
    ).not.toBeInTheDocument()
  })

  it('explains why the neighbour-dependent cards stay on manual entry', () => {
    renderWithCards(allA)

    // Village A is in play by default and can't be computed
    expect(screen.getAllByText(/neighbouring players/).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Enter Alice Village total by hand')).not.toBeInTheDocument()
  })
})
