import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Player } from '../../domain/model/player'
import { RoundEntrySheet } from './RoundEntrySheet'

const alice: Player = { id: 'alice', name: 'Alice', active: true }
const bob: Player = { id: 'bob', name: 'Bob', active: true }

describe('RoundEntrySheet', () => {
  it('renders nothing when closed', () => {
    render(
      <RoundEntrySheet
        open={false}
        roundNumber={1}
        players={[alice, bob]}
        totals={new Map()}
        inputs={{}}
        onChange={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the round title, each player name, their current total and a stepper', () => {
    render(
      <RoundEntrySheet
        open
        roundNumber={4}
        players={[alice, bob]}
        totals={new Map([['alice', 16], ['bob', 26]])}
        inputs={{ alice: 0, bob: 0 }}
        onChange={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const sheet = screen.getByRole('dialog', { name: 'Round 4' })
    expect(within(sheet).getByText('Alice', { exact: false })).toBeInTheDocument()
    expect(within(sheet).getByText('· 16')).toBeInTheDocument()
    expect(within(sheet).getByText('· 26')).toBeInTheDocument()
    expect(within(sheet).getAllByRole('spinbutton')).toHaveLength(2)
  })

  it('calls onChange with the parsed value when a player field is edited', () => {
    const onChange = vi.fn()
    render(
      <RoundEntrySheet
        open
        roundNumber={1}
        players={[alice, bob]}
        totals={new Map()}
        inputs={{ alice: 0, bob: 0 }}
        onChange={onChange}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const [aliceInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '12' } })

    expect(onChange).toHaveBeenCalledWith('alice', 12)
  })

  it('calls onCancel from the footer button and from clicking the scrim', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <RoundEntrySheet
        open
        roundNumber={1}
        players={[alice]}
        totals={new Map()}
        inputs={{ alice: 0 }}
        onChange={vi.fn()}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(container.querySelector('.sheet-scrim')!)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('calls onSubmit from the "Save round" button', () => {
    const onSubmit = vi.fn()
    render(
      <RoundEntrySheet
        open
        roundNumber={1}
        players={[alice]}
        totals={new Map()}
        inputs={{ alice: 0 }}
        onChange={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByText('Save round'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
