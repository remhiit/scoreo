import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Player } from '../../domain/model/player'
import { CreateMatchUseCase } from '../../application/createMatchUseCase'
import i18n from '../../i18n/i18n'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { buildInitialState, type ScoreDetailDeps } from './scoreDetailReducer'
import { ScoreDetailScreen } from './ScoreDetailScreen'
import type { ScoreDetailMode } from './scoreDetailTypes'

function gameType(
  winCondition: GameType['winCondition'] = 'HIGHEST_SCORE',
  tieBreakRule: GameType['tieBreakRule'] = 'NONE',
): GameType {
  return {
    id: 'gt1',
    name: 'TestGame',
    winCondition,
    tieBreakRule,
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
  }
}

const alice: Player = { id: 'alice', name: 'Alice', active: true }
const bob: Player = { id: 'bob', name: 'Bob', active: true }

function renderScreen(
  gt: GameType,
  options: { matchDraftRepository?: InMemoryMatchDraftRepository; mode?: ScoreDetailMode } = {},
) {
  const gameTypeRepo = new InMemoryGameTypeRepository()
  gameTypeRepo.save(gt)
  const matchRepo = new InMemoryMatchRepository()
  const mode: ScoreDetailMode = options.mode ?? { type: 'Create' }
  const deps: ScoreDetailDeps = {
    createMatch: new CreateMatchUseCase(matchRepo, gameTypeRepo),
    mode,
    currentDate: () => 1767225600000,
    matchDraftRepository: options.matchDraftRepository,
  }
  const initialState = buildInitialState(gt, [alice, bob], mode, deps.currentDate, options.matchDraftRepository)
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  const result = render(
    <ScoreDetailScreen initialState={initialState} {...deps} onSaved={onSaved} onCancel={onCancel} />,
  )
  return { matchRepo, onSaved, onCancel, unmount: result.unmount }
}

function scoreInputs() {
  return screen.getAllByRole('spinbutton') as HTMLInputElement[]
}

/** Score entry lives under the History tab (the Standings view is a read-only ranking) — switch to it first. */
function switchToHistory() {
  fireEvent.click(screen.getByText('History'))
}

function dateInput() {
  return screen.getByLabelText('Match date') as HTMLInputElement
}

describe('ScoreDetailScreen', () => {
  it('shows the match date field prefilled to today, capped at today', () => {
    renderScreen(gameType())

    expect(dateInput().value).toBe('2026-01-01')
    expect(dateInput().max).toBe('2026-01-01')
  })

  it('changing the date field is reflected on the saved match', () => {
    const { matchRepo } = renderScreen(gameType())

    fireEvent.change(dateInput(), { target: { value: '2025-12-20' } })
    switchToHistory()
    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '5' } })
    fireEvent.click(screen.getByText('Finish match'))

    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].date).toBe(Date.UTC(2025, 11, 20, 0, 0, 0, 0))
  })

  it('picking a future date blocks the save with an error', () => {
    const { matchRepo } = renderScreen(gameType())

    fireEvent.change(dateInput(), { target: { value: '2026-01-02' } })
    switchToHistory()
    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '5' } })
    fireEvent.click(screen.getByText('Finish match'))

    expect(matchRepo.getAll()).toHaveLength(0)
    expect(screen.getByText('Match date cannot be in the future')).toBeInTheDocument()
  })

  it('defaults to the Standings view, showing a rank card per player', () => {
    renderScreen(gameType())

    expect(screen.getByText('Standings').closest('button')).toHaveClass('on')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.getByText('Alice', { selector: '.gs-name' })).toBeInTheDocument()
    expect(screen.getByText('Bob', { selector: '.gs-name' })).toBeInTheDocument()
  })

  it('switching to History reveals one editable round card per round', () => {
    renderScreen(gameType())

    switchToHistory()

    expect(screen.getByText('History').closest('button')).toHaveClass('on')
    expect(document.querySelectorAll('.hist-round')).toHaveLength(1)
    expect(within(document.querySelector('.hist-cell') as HTMLElement).getByText('Alice')).toBeInTheDocument()
    expect(scoreInputs()).toHaveLength(2)
  })

  it('reflects entered scores back in the Standings view, leading card first', () => {
    renderScreen(gameType())
    switchToHistory()

    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '4' } })

    fireEvent.click(screen.getByText('Standings'))

    const cards = document.querySelectorAll('.gs-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveClass('gs-card--lead')
    expect(within(cards[0] as HTMLElement).getByText('Alice')).toBeInTheDocument()
    expect(within(cards[0] as HTMLElement).getByText('10')).toBeInTheDocument()
    expect(within(cards[0] as HTMLElement).getByText('+10')).toBeInTheDocument()
  })

  it('renders player headers and finishes a match with no tie', () => {
    const { matchRepo, onSaved } = renderScreen(gameType())
    switchToHistory()

    const cells = document.querySelectorAll('.hist-cell')
    expect(within(cells[0] as HTMLElement).getByText('Alice')).toBeInTheDocument()
    expect(within(cells[1] as HTMLElement).getByText('Bob')).toBeInTheDocument()

    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '5' } })
    fireEvent.click(screen.getByText('Finish match'))

    expect(matchRepo.getAll()).toHaveLength(1)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('the "Add round" button under History opens the round entry sheet, and cards can be removed', () => {
    renderScreen(gameType())
    switchToHistory()

    expect(screen.queryByTitle('Remove round')).not.toBeInTheDocument()

    // First submission fills the still-empty round 1; a second is needed to append round 2.
    fireEvent.click(screen.getByText('Add round'))
    let sheet = screen.getByRole('dialog', { name: 'Round 1' })
    let [aliceInput, bobInput] = within(sheet).getAllByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '4' } })
    fireEvent.click(within(sheet).getByText('Save round'))

    expect(document.querySelectorAll('.hist-round')).toHaveLength(1)

    fireEvent.click(screen.getByText('Add round'))
    sheet = screen.getByRole('dialog', { name: 'Round 2' })
    ;[aliceInput, bobInput] = within(sheet).getAllByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '5' } })
    fireEvent.change(bobInput, { target: { value: '2' } })
    fireEvent.click(within(sheet).getByText('Save round'))

    expect(scoreInputs()).toHaveLength(4)
    expect(screen.getAllByTitle('Remove round')).toHaveLength(2)

    fireEvent.click(screen.getAllByTitle('Remove round')[0])
    expect(document.querySelectorAll('.hist-round')).toHaveLength(1)
    expect(scoreInputs()).toHaveLength(2)
    expect(screen.queryByTitle('Remove round')).not.toBeInTheDocument()
  })

  it('opens the round entry sheet from the bottom bar, showing every player at 0 next to their total', () => {
    renderScreen(gameType())

    fireEvent.click(screen.getByText('Enter round 1'))

    const sheet = screen.getByRole('dialog', { name: 'Round 1' })
    expect(within(sheet).getByText('Alice', { exact: false })).toBeInTheDocument()
    expect(within(sheet).getAllByRole('spinbutton').map((el) => (el as HTMLInputElement).value)).toEqual(['0', '0'])
  })

  it('validating the sheet adds the round and updates the standings immediately', () => {
    renderScreen(gameType())

    fireEvent.click(screen.getByText('Enter round 1'))
    const sheet = screen.getByRole('dialog', { name: 'Round 1' })
    const [aliceInput, bobInput] = within(sheet).getAllByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '4' } })
    fireEvent.click(within(sheet).getByText('Save round'))

    expect(screen.queryByText('Round 1')).not.toBeInTheDocument()
    const cards = document.querySelectorAll('.gs-card')
    expect(within(cards[0] as HTMLElement).getByText('Alice')).toBeInTheDocument()
    expect(within(cards[0] as HTMLElement).getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Enter round 2')).toBeInTheDocument()
  })

  it('cancelling the sheet closes it without writing any round', () => {
    renderScreen(gameType())

    fireEvent.click(screen.getByText('Enter round 1'))
    const sheet = screen.getByRole('dialog', { name: 'Round 1' })
    const [aliceInput] = within(sheet).getAllByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.click(within(sheet).getByText('Cancel'))

    expect(screen.queryByText('Round 1')).not.toBeInTheDocument()
    expect(screen.getByText('Enter round 1')).toBeInTheDocument()
    switchToHistory()
    expect(scoreInputs()[0]).toHaveValue(null)
  })

  it('validating a round via the sheet saves a draft to the repository', () => {
    const draftRepo = new InMemoryMatchDraftRepository()
    renderScreen(gameType(), { matchDraftRepository: draftRepo })

    fireEvent.click(screen.getByText('Enter round 1'))
    const sheet = screen.getByRole('dialog', { name: 'Round 1' })
    const [aliceInput] = within(sheet).getAllByRole('spinbutton')
    fireEvent.change(aliceInput, { target: { value: '7' } })
    fireEvent.click(within(sheet).getByText('Save round'))

    expect(draftRepo.load()?.rounds[0].alice).toBe('7')
  })

  it('shows an error for a non-integer score and does not save', () => {
    // A real <input type="number"> rejects letters outright (jsdom included), so
    // "abc" can never reach state through the DOM — a decimal is the realistic
    // way a user reaches the "expected a number" validation via this input.
    const { matchRepo, onSaved } = renderScreen(gameType())
    switchToHistory()

    const [aliceInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '1.5' } })
    fireEvent.click(screen.getByText('Finish match'))

    expect(screen.getByText('Invalid score for Alice in round 1: expected a number')).toBeInTheDocument()
    expect(matchRepo.getAll()).toHaveLength(0)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('MANUAL winCondition opens the winner selection modal', () => {
    const { matchRepo, onSaved } = renderScreen(gameType('MANUAL'))
    switchToHistory()

    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '5' } })
    fireEvent.click(screen.getByText('Finish match'))

    expect(screen.getByText('Select winner(s)')).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Alice', { selector: '.list-item-name' }))
    fireEvent.click(within(dialog).getByText('Confirm'))

    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice'])
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('a tie with SECONDARY_SCORE opens the secondary score dialog and resolves it', () => {
    const { matchRepo, onSaved } = renderScreen(gameType('HIGHEST_SCORE', 'SECONDARY_SCORE'))
    switchToHistory()

    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '10' } })
    fireEvent.click(screen.getByText('Finish match'))

    expect(screen.getByText('Secondary score ?')).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    const [secondaryAlice, secondaryBob] = within(dialog).getAllByRole('spinbutton')
    fireEvent.change(secondaryAlice, { target: { value: '100' } })
    fireEvent.change(secondaryBob, { target: { value: '50' } })
    fireEvent.click(within(dialog).getByText('Confirm'))

    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice'])
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('a persisting secondary tie escalates to manual selection', () => {
    const { matchRepo } = renderScreen(gameType('HIGHEST_SCORE', 'SECONDARY_SCORE'))
    switchToHistory()

    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '10' } })
    fireEvent.click(screen.getByText('Finish match'))

    const secondaryDialog = screen.getByRole('dialog')
    const [secondaryAlice, secondaryBob] = within(secondaryDialog).getAllByRole('spinbutton')
    fireEvent.change(secondaryAlice, { target: { value: '50' } })
    fireEvent.change(secondaryBob, { target: { value: '50' } })
    fireEvent.click(within(secondaryDialog).getByText('Confirm'))

    expect(screen.getByText('Final decision')).toBeInTheDocument()
    const manualDialog = screen.getByRole('dialog')
    fireEvent.click(within(manualDialog).getByText('Keep tie'))

    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice', 'bob'])
  })

  it('manual selection dialog selects a winner via a selectable row, not a checkbox', () => {
    const { matchRepo } = renderScreen(gameType('HIGHEST_SCORE', 'MANUAL_SELECTION'))
    switchToHistory()

    const [aliceInput, bobInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.change(bobInput, { target: { value: '10' } })
    fireEvent.click(screen.getByText('Finish match'))

    const dialog = screen.getByRole('dialog', { name: 'Final decision' })
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Alice', { selector: '.list-item-name' }))
    fireEvent.click(within(dialog).getByText('Confirm'))

    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice'])
  })

  it('cancelling with entered scores shows a confirmation, discard clears and calls onCancel', () => {
    const { onCancel } = renderScreen(gameType())
    switchToHistory()

    const [aliceInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '10' } })
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.getByText('Discard scores?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Discard'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancelling with no scores entered calls onCancel immediately without a confirmation', () => {
    const { onCancel } = renderScreen(gameType())

    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Discard scores?')).not.toBeInTheDocument()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('auto-saves a draft after a score update and restores it on next mount', () => {
    const draftRepo = new InMemoryMatchDraftRepository()
    const first = renderScreen(gameType(), { matchDraftRepository: draftRepo })
    switchToHistory()

    const [aliceInput] = scoreInputs()
    fireEvent.change(aliceInput, { target: { value: '42' } })

    expect(draftRepo.load()?.rounds[0].alice).toBe('42')
    first.unmount()

    renderScreen(gameType(), { matchDraftRepository: draftRepo })
    switchToHistory()
    expect(scoreInputs()[0]).toHaveValue(42)
  })

  it('updates displayed labels immediately when the language changes', async () => {
    renderScreen(gameType())

    expect(screen.getByText('Standings')).toBeInTheDocument()
    expect(screen.getByText('Finish match')).toBeInTheDocument()

    await i18n.changeLanguage('fr')

    expect(screen.getByText('Classement')).toBeInTheDocument()
    expect(screen.getByText('Terminer la partie')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
