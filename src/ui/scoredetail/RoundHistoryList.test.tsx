import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Player } from '../../domain/model/player'
import { RoundHistoryList } from './RoundHistoryList'

const alice: Player = { id: 'alice', name: 'Alice', active: true }
const bob: Player = { id: 'bob', name: 'Bob', active: true }

describe('RoundHistoryList', () => {
  it('renders one card per round with a labelled header and a cell per player', () => {
    render(
      <RoundHistoryList
        rounds={[{ alice: '10', bob: '4' }]}
        players={[alice, bob]}
        onChangeScore={vi.fn()}
        onRemoveRound={vi.fn()}
        onAddRound={vi.fn()}
      />,
    )

    expect(document.querySelectorAll('.hist-round')).toHaveLength(1)
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    const cells = document.querySelectorAll('.hist-cell')
    expect(cells).toHaveLength(2)
    expect(within(cells[0] as HTMLElement).getByText('Alice')).toBeInTheDocument()
    expect(within(cells[0] as HTMLElement).getByRole('spinbutton')).toHaveValue(10)
    expect(within(cells[1] as HTMLElement).getByText('Bob')).toBeInTheDocument()
    expect(within(cells[1] as HTMLElement).getByRole('spinbutton')).toHaveValue(4)
  })

  it('does not show a remove button while only one round exists', () => {
    render(
      <RoundHistoryList
        rounds={[{}]}
        players={[alice, bob]}
        onChangeScore={vi.fn()}
        onRemoveRound={vi.fn()}
        onAddRound={vi.fn()}
      />,
    )

    expect(screen.queryByTitle('Remove round')).not.toBeInTheDocument()
  })

  it('shows a remove button per card once several rounds exist, calling onRemoveRound with its index', () => {
    const onRemoveRound = vi.fn()
    render(
      <RoundHistoryList
        rounds={[{}, {}]}
        players={[alice, bob]}
        onChangeScore={vi.fn()}
        onRemoveRound={onRemoveRound}
        onAddRound={vi.fn()}
      />,
    )

    const removeButtons = screen.getAllByTitle('Remove round')
    expect(removeButtons).toHaveLength(2)
    fireEvent.click(removeButtons[1])
    expect(onRemoveRound).toHaveBeenCalledWith(1)
  })

  it('editing a cell calls onChangeScore with the round index, player id and new value', () => {
    const onChangeScore = vi.fn()
    render(
      <RoundHistoryList
        rounds={[{}]}
        players={[alice, bob]}
        onChangeScore={onChangeScore}
        onRemoveRound={vi.fn()}
        onAddRound={vi.fn()}
      />,
    )

    const [, bobInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(bobInput, { target: { value: '12' } })
    expect(onChangeScore).toHaveBeenCalledWith(0, 'bob', '12')
  })

  it('clicking "Add round" calls onAddRound', () => {
    const onAddRound = vi.fn()
    render(
      <RoundHistoryList
        rounds={[{}]}
        players={[alice, bob]}
        onChangeScore={vi.fn()}
        onRemoveRound={vi.fn()}
        onAddRound={onAddRound}
      />,
    )

    fireEvent.click(screen.getByText('Add round'))
    expect(onAddRound).toHaveBeenCalledTimes(1)
  })
})
