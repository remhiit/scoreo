// @vitest-environment jsdom
import {
  assertRoundsSumToRanking,
  type ModuleHost,
  type ModuleMatchResult,
  type ModulePlayer,
} from '@scoreboards/module-api'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MilleSabordsModuleScreen from './MilleSabordsModuleScreen'

afterEach(cleanup)

const JOUEURS: ModulePlayer[] = [
  { id: 'p1', name: 'Anne Bonny' },
  { id: 'p2', name: 'Mary Read' },
]

/** A host that remembers its draft, which is the whole point of the trio. */
function hoteFactice(draft?: unknown) {
  const saved: ModuleMatchResult[] = []
  let brouillon = draft
  const host: ModuleHost = {
    getPlayers: () => JOUEURS,
    saveMatch: (result) => {
      saved.push(result)
      brouillon = undefined
      return 'match-1'
    },
    loadDraft: () => brouillon,
    saveDraft: (state) => {
      // Round-tripped through JSON, as localStorage would: a state that cannot
      // survive that is not really persisted.
      brouillon = JSON.parse(JSON.stringify(state))
    },
    clearDraft: () => {
      brouillon = undefined
    },
  }
  return { host, saved, brouillon: () => brouillon }
}

function saisirScore(valeur: string) {
  fireEvent.click(screen.getByRole('tab', { name: /Saisie rapide/ }))
  fireEvent.change(screen.getByLabelText('Score'), { target: { value: valeur } })
  fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
}

describe('MilleSabordsModuleScreen', () => {
  it('names the players the host knows, not the ids it scores by', () => {
    const { host } = hoteFactice()
    render(
      <MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />,
    )

    expect(screen.getByRole('columnheader', { name: 'Anne Bonny' })).toBeDefined()
    expect(screen.getByText('Mary Read')).toBeDefined()
  })

  it('keeps the dice and the card across a reload', () => {
    const { host } = hoteFactice()
    const ecran = (
      <MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />
    )
    render(ecran)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un Diamant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un Diamant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un Or' }))
    fireEvent.change(screen.getByLabelText('Carte piochée'), { target: { value: 'captain' } })

    // The reload the Kotlin app lost this to: four module-level `var`s that
    // were never written anywhere.
    cleanup()
    render(ecran)

    expect(screen.getByLabelText('Diamant : compteur').textContent).toBe('2')
    expect(screen.getByLabelText('Or : compteur').textContent).toBe('1')
    expect((screen.getByLabelText('Carte piochée') as HTMLSelectElement).value).toBe('captain')
  })

  it('keeps the standings across a reload', () => {
    const { host } = hoteFactice()
    const ecran = (
      <MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />
    )
    render(ecran)

    saisirScore('1300')
    cleanup()
    render(ecran)

    expect(screen.getByRole('row', { name: /Tour 1/ }).textContent).toContain('1300')
    expect(screen.getByRole('row', { name: /Total/ }).textContent).toContain('1300')
  })

  it.each([
    ['a payload from another version', { version: 99, joueurs: ['p1', 'p2'], historique: [] }],
    ['a truncated payload', '{"version":1,"joueurs":['],
    ['a payload for another table', { version: 1, joueurs: ['x', 'y'], historique: [] }],
  ])('starts a clean game on %s rather than crashing', (_label, draft) => {
    const { host } = hoteFactice(draft)

    render(
      <MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />,
    )

    expect(screen.getByText(/Aucun coup joué/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Annuler le coup/ })).toHaveProperty('disabled', true)
  })

  it('reopens the match the host handed back instead of the draft', () => {
    const { host } = hoteFactice({ version: 1, joueurs: ['p1', 'p2'], historique: [] })

    render(
      <MilleSabordsModuleScreen
        host={host}
        playerIds={['p1', 'p2']}
        editing={{
          matchId: 'match-1',
          version: 1,
          data: {
            joueurs: ['p1', 'p2'],
            historique: [
              { type: 'manuel', joueur: 'p1', scoreEntre: 700, multiplicateur: 1, score: 700 },
            ],
          },
        }}
        onExit={() => undefined}
      />,
    )

    expect(screen.getByRole('row', { name: /Tour 1/ }).textContent).toContain('700')
  })

  it('hands the host a result whose rounds add up, then leaves', () => {
    const { host, saved } = hoteFactice()
    const onExit = vi.fn()
    render(<MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} />)

    saisirScore('900')
    saisirScore('400')
    fireEvent.click(screen.getByRole('button', { name: /Terminer la partie/ }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la partie/ }))

    expect(saved).toHaveLength(1)
    expect(() => assertRoundsSumToRanking(saved[0])).not.toThrow()
    expect(saved[0].ranking).toEqual([
      { playerId: 'p1', score: 900, rank: 1 },
      { playerId: 'p2', score: 400, rank: 2 },
    ])
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('updates the match it reopened rather than filing a second one', () => {
    const { host, saved } = hoteFactice()
    render(
      <MilleSabordsModuleScreen
        host={host}
        playerIds={['p1', 'p2']}
        editing={{
          matchId: 'match-7',
          version: 1,
          data: { joueurs: ['p1', 'p2'], historique: [] },
        }}
        onExit={() => undefined}
      />,
    )

    saisirScore('100')
    saisirScore('200')
    fireEvent.click(screen.getByRole('button', { name: /Terminer la partie/ }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la partie/ }))

    expect(saved[0].matchId).toBe('match-7')
  })

  // Stepping out is no longer a button the module draws itself — that is the
  // host's ✕ now (#389) — so from the module's side it is simply never calling
  // `clearDraft`, unlike abandoning.
  it('drops the draft when the players abandon', () => {
    const { host, brouillon } = hoteFactice()
    render(<MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />)

    saisirScore('500')
    expect(brouillon()).not.toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: /Abandonner$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))

    expect(brouillon()).toBeUndefined()
  })

  it('announces the last round once someone crosses 6000', () => {
    const { host } = hoteFactice()
    render(
      <MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />,
    )

    saisirScore('6200')

    expect(screen.getByText(/Dernier tour/)).toBeDefined()
  })

  it('previews the score of the hand being counted, before it is recorded', () => {
    const { host } = hoteFactice()
    render(
      <MilleSabordsModuleScreen host={host} playerIds={['p1', 'p2']} onExit={() => undefined} />,
    )

    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter un Diamant' }))
    }

    // 4 diamonds: 400 points, plus the 200 series bonus.
    expect(screen.getByText('600 pts')).toBeDefined()
  })
})
