// @vitest-environment jsdom
import type { ModuleHost, ModuleMatchResult, ModulePlayer } from '@scoreboards/module-api'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SkyjoModuleScreen from './SkyjoModuleScreen'

afterEach(cleanup)

const PLAYERS: ModulePlayer[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

function fakeHost(draft?: unknown) {
  const saved: ModuleMatchResult[] = []
  let stored = draft
  const host: ModuleHost = {
    getPlayers: () => PLAYERS,
    saveMatch: (result) => {
      saved.push(result)
      stored = undefined
      return 'match-1'
    },
    loadDraft: () => stored,
    saveDraft: (state) => {
      // Round-tripped through JSON, as localStorage would.
      stored = JSON.parse(JSON.stringify(state))
    },
    clearDraft: () => {
      stored = undefined
    },
  }
  return { host, saved, stored: () => stored }
}

function playRound(enderName: string, scoreByName: Record<string, string>) {
  fireEvent.click(screen.getByRole('radio', { name: enderName }))
  for (const [name, value] of Object.entries(scoreByName)) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Valider la manche' }))
}

describe('SkyjoModuleScreen', () => {
  it('renders nothing when the host hands over no player', () => {
    const { host } = fakeHost()
    const noPlayers: ModuleHost = { ...host, getPlayers: () => [] }
    const { container } = render(
      <SkyjoModuleScreen host={noPlayers} playerIds={[]} onExit={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('starts on Manche 1 with an empty scoreboard', () => {
    const { host } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    expect(screen.getByText('Manche 1')).toBeInTheDocument()
    expect(screen.getByText(/Aucune manche jouée/)).toBeInTheDocument()
  })

  it('disables submit until an ender and every score are set', () => {
    const { host } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Valider la manche' })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByRole('radio', { name: 'Alice' }))
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Alice'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Bob'), { target: { value: '20' } })
    expect(submit).not.toBeDisabled()
  })

  it('records a round, doubling the ender when not the lowest', () => {
    const { host } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)

    playRound('Bob', { Alice: '4', Bob: '10' })

    // Bob ended but was not the lowest (10 > 4) -> doubled to 20.
    expect(screen.getByText('20 ×2')).toBeInTheDocument()
    expect(screen.getByText('Manche 2')).toBeInTheDocument()
  })

  it('persists the turn in progress through the draft', () => {
    const { host, stored } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Alice' }))
    fireEvent.change(screen.getByLabelText('Alice'), { target: { value: '5' } })

    const draft = stored() as { enderPlayerId?: string; scoreInputs: Record<string, string> }
    expect(draft.enderPlayerId).toBe('p1')
    expect(draft.scoreInputs.p1).toBe('5')
  })

  it('reaches the end screen once a total crosses 100, and saves on demand', () => {
    const onExit = vi.fn()
    const { host, saved } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} />)

    playRound('Alice', { Alice: '10', Bob: '105' })

    expect(screen.getByText('Alice remporte la partie !')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '💾 Enregistrer la partie' }))
    expect(saved).toHaveLength(1)
    expect(saved[0].ranking).toEqual(
      expect.arrayContaining([
        { playerId: 'p1', score: 10, rank: 1 },
        { playerId: 'p2', score: 105, rank: 2 },
      ]),
    )
    expect(onExit).toHaveBeenCalled()
  })

  it('shows a tie on the end screen and saves both players at rank 1', () => {
    const onExit = vi.fn()
    const { host, saved } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} />)

    // Ender's score equals the round's lowest -> no doubling, both at 100.
    playRound('Alice', { Alice: '100', Bob: '100' })

    expect(screen.getByText('Égalité entre Alice et Bob !')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '💾 Enregistrer la partie' }))
    expect(saved[0].ranking).toEqual(
      expect.arrayContaining([
        { playerId: 'p1', score: 100, rank: 1 },
        { playerId: 'p2', score: 100, rank: 1 },
      ]),
    )
  })

  it('abandoning clears the draft and exits without saving', () => {
    const onExit = vi.fn()
    const { host, saved, stored } = fakeHost()
    render(<SkyjoModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} />)

    fireEvent.click(screen.getByRole('button', { name: '🗑 Abandonner' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))

    expect(saved).toHaveLength(0)
    expect(stored()).toBeUndefined()
    expect(onExit).toHaveBeenCalled()
  })
})
