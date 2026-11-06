// @vitest-environment jsdom
import type { ModuleHost, ModuleMatchResult, ModulePlayer } from '@scoreboards/module-api'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Flip7ModuleScreen from './Flip7ModuleScreen'

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

const panel = (name: string) => screen.getByRole('region', { name })

function tap(playerName: string, ...cards: string[]) {
  for (const card of cards) {
    fireEvent.click(within(panel(playerName)).getByRole('button', { name: card }))
  }
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Valider la manche' }))

describe('Flip7ModuleScreen', () => {
  it('renders nothing when the host hands over no player', () => {
    const { host } = fakeHost()
    const { container } = render(
      <Flip7ModuleScreen
        host={{ ...host, getPlayers: () => [] }}
        playerIds={[]}
        onExit={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('starts on Manche 1 with one hand per player', () => {
    const { host } = fakeHost()
    render(<Flip7ModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    expect(screen.getByText('Manche 1')).toBeInTheDocument()
    expect(panel('Alice')).toBeInTheDocument()
    expect(panel('Bob')).toBeInTheDocument()
    expect(screen.getByText(/Aucune manche jouée/)).toBeInTheDocument()
  })

  it('computes the hand score live, ×2 before the modifiers', () => {
    const { host } = fakeHost()
    render(<Flip7ModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    tap('Alice', '5', '7', '×2', '+4')
    expect(screen.getByLabelText('Score de la manche de Alice : 28')).toBeInTheDocument()
  })

  it('announces a Flip 7 and a bust', () => {
    const { host } = fakeHost()
    render(<Flip7ModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    tap('Alice', '0', '1', '2', '3', '4', '5', '6')
    expect(screen.getByText(/Flip 7 ! \+15/)).toBeInTheDocument()
    expect(screen.getByLabelText('Score de la manche de Alice : 36')).toBeInTheDocument()

    tap('Bob', '12', '💥 Bust')
    expect(screen.getByLabelText('Score de la manche de Bob : 0')).toBeInTheDocument()
  })

  it('records a round into the standings and the round log', () => {
    const { host } = fakeHost()
    render(<Flip7ModuleScreen host={host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    tap('Alice', '10')
    tap('Bob', '3')
    submit()

    expect(screen.getByText('Manche 2')).toBeInTheDocument()
    const standings = screen.getByRole('list', { name: 'Classement' })
    expect(within(standings).getByText('10 pts')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Manche 1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Score de la manche de Alice : 0')).toBeInTheDocument()
  })

  it('keeps the hand in progress in the draft and restores it', () => {
    const first = fakeHost()
    render(<Flip7ModuleScreen host={first.host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    tap('Bob', '9')
    cleanup()

    const second = fakeHost(first.stored())
    render(<Flip7ModuleScreen host={second.host} playerIds={['p1', 'p2']} onExit={vi.fn()} />)
    expect(screen.getByLabelText('Score de la manche de Bob : 9')).toBeInTheDocument()
  })

  it('ends at 200, saves the match and exits', () => {
    const { host, saved } = fakeHost()
    const onExit = vi.fn()
    render(<Flip7ModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} />)
    for (let i = 0; i < 9; i++) {
      tap('Alice', '12', '11')
      submit()
    }

    expect(screen.getByText('Alice remporte la partie !', { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '💾 Enregistrer la partie' }))
    expect(saved).toHaveLength(1)
    expect(saved[0].ranking[0]).toEqual({ playerId: 'p1', score: 207, rank: 1 })
    expect(saved[0].matchId).toBeUndefined()
    expect(onExit).toHaveBeenCalled()
  })

  it('reopens a match in ranking order, restores it and updates it without touching the draft itself', () => {
    const pending = { unrelated: 'draft of another game' }
    const { host, saved, stored } = fakeHost(pending)
    // Bob (p2) won, so the host lists him first, as `playerScores` does.
    const rounds = Array.from({ length: 9 }, () => ({
      entries: [
        { playerId: 'p1', hand: { busted: false, numbers: [], modifiers: [], doubled: false } },
        {
          playerId: 'p2',
          hand: { busted: false, numbers: [11, 12], modifiers: [], doubled: false },
        },
      ],
    }))
    render(
      <Flip7ModuleScreen
        host={host}
        playerIds={['p2', 'p1']}
        editing={{ matchId: 'm-7', version: 1, data: { players: ['p1', 'p2'], rounds } }}
        onExit={vi.fn()}
      />,
    )
    expect(screen.getByText('Bob remporte la partie !', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Manche 9' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '💾 Enregistrer la partie' }))
    expect(saved[0].matchId).toBe('m-7')
    expect(saved[0].ranking[0]).toEqual({ playerId: 'p2', score: 207, rank: 1 })
    // The fake host does not clear on save, so this proves the module wrote nothing there.
    expect(stored()).toEqual(pending)
  })

  it('abandons after confirmation, clearing the draft', () => {
    const { host, stored } = fakeHost()
    const onExit = vi.fn()
    render(<Flip7ModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: '🗑 Abandonner' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))
    expect(stored()).toBeUndefined()
    expect(onExit).toHaveBeenCalled()
  })
})
