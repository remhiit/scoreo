import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { MergeGameTypesUseCase } from '../../application/mergeGameTypesUseCase'
import { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import i18n from '../../i18n/i18n'
import { GameTypeScreen } from './GameTypeScreen'

function renderScreen(repo = new InMemoryGameTypeRepository()) {
  return render(
    <GameTypeScreen
      addGameType={new AddGameTypeUseCase(repo)}
      updateGameType={new UpdateGameTypeUseCase(repo)}
      getGameTypes={new GetGameTypesUseCase(repo)}
      findGameTypeById={new FindGameTypeByIdUseCase(repo)}
      archiveGameType={new ArchiveGameTypeUseCase(repo)}
      mergeGameTypes={
        new MergeGameTypesUseCase(repo, new InMemoryMatchRepository(), new InMemoryMatchDraftRepository())
      }
    />,
  )
}

function nameInput() {
  return screen.getByPlaceholderText('Game name')
}

function buildGameType(id: string, name: string) {
  return {
    id,
    name,
    winCondition: 'HIGHEST_SCORE' as const,
    tieBreakRule: 'NONE' as const,
    tieBreakCondition: 'HIGHEST_SCORE' as const,
    tieBreakLabel: null,
    active: true,
  }
}

describe('GameTypeScreen', () => {
  it('shows the empty message when there are no game types', () => {
    renderScreen()
    expect(screen.getByText('No game types yet. Add one.')).toBeInTheDocument()
  })

  it('adds a game type and shows it in the list', () => {
    renderScreen()

    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()
    expect(nameInput()).toHaveValue('')
  })

  it('shows a validation error for a blank name and does not add it', () => {
    renderScreen()

    fireEvent.click(screen.getByText('Add game type'))

    expect(screen.getByText('name: Game type name must not be blank')).toBeInTheDocument()
    expect(screen.getByText('No game types yet. Add one.')).toBeInTheDocument()
  })

  it('shows the tie-break condition and label fields only for SECONDARY_SCORE', () => {
    renderScreen()

    expect(screen.queryByPlaceholderText('e.g. Number of cards')).not.toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('No tie-break'), { target: { value: 'SECONDARY_SCORE' } })

    expect(screen.getByPlaceholderText('e.g. Number of cards')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('Highest score')).toHaveLength(2)
  })

  it('opens the detail modal and navigates to edit from it', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByLabelText('View details'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('Win condition')).toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('dialog')).getByText('Edit'))

    expect(screen.getByText('Edit Belote')).toBeInTheDocument()
  })

  it('shows detail rows without trailing colons, including tie-break condition and question', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Tarot' } })
    fireEvent.change(screen.getByDisplayValue('No tie-break'), { target: { value: 'SECONDARY_SCORE' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Number of cards'), { target: { value: 'Number of cards' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByLabelText('View details'))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText('Win condition')).toBeInTheDocument()
    expect(within(dialog).getByText('Tie break')).toBeInTheDocument()
    expect(within(dialog).getByText('Tie break condition')).toBeInTheDocument()
    expect(within(dialog).getByText('Tie break question')).toBeInTheDocument()
    expect(within(dialog).getByText('Number of cards')).toBeInTheDocument()
    expect(within(dialog).queryByText(/:$/)).not.toBeInTheDocument()
  })

  it('edits a game type via the Edit action and saves the new tie-break rule', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByLabelText('Edit'))
    expect(screen.getByText('Edit Belote')).toBeInTheDocument()

    const editDialog = screen.getByRole('dialog')
    fireEvent.change(within(editDialog).getByDisplayValue('No tie-break'), {
      target: { value: 'MANUAL_SELECTION' },
    })
    fireEvent.click(within(editDialog).getByText('Save changes'))

    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('View details'))
    expect(within(screen.getByRole('dialog')).getByText('Manual selection')).toBeInTheDocument()
  })

  it('cancelling edit restores the add form without changes', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByLabelText('Edit'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()
    expect(nameInput()).toHaveValue('')
  })

  it('archives a game type through the confirmation dialog', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByLabelText('Delete'))
    expect(screen.getByText('Archive Belote?')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Delete'))
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Archive'))

    expect(screen.queryByText('Belote', { selector: '.list-item-name' })).not.toBeInTheDocument()
    expect(screen.getByText('No game types yet. Add one.')).toBeInTheDocument()
  })

  it('hides the screen title when showTitle is false', () => {
    const repo = new InMemoryGameTypeRepository()
    render(
      <GameTypeScreen
        addGameType={new AddGameTypeUseCase(repo)}
        updateGameType={new UpdateGameTypeUseCase(repo)}
        getGameTypes={new GetGameTypesUseCase(repo)}
        findGameTypeById={new FindGameTypeByIdUseCase(repo)}
        archiveGameType={new ArchiveGameTypeUseCase(repo)}
        mergeGameTypes={
          new MergeGameTypesUseCase(repo, new InMemoryMatchRepository(), new InMemoryMatchDraftRepository())
        }
        showTitle={false}
      />,
    )

    expect(screen.queryByText('Game Types')).not.toBeInTheDocument()
  })

  it('updates displayed labels immediately when the language changes', async () => {
    renderScreen()

    expect(screen.getByText('Game Types')).toBeInTheDocument()
    expect(screen.getByText('No game types yet. Add one.')).toBeInTheDocument()

    await i18n.changeLanguage('fr')

    expect(screen.getByText('Types de jeu')).toBeInTheDocument()
    expect(screen.getByText("Aucun type de jeu pour l'instant. Ajoutez-en un.")).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })

  it('offers a merge only once two game types exist', () => {
    const repo = new InMemoryGameTypeRepository()
    renderScreen(repo)

    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))
    expect(screen.queryByText('Merge')).not.toBeInTheDocument()

    fireEvent.change(nameInput(), { target: { value: 'Belote coinchee' } })
    fireEvent.click(screen.getByText('Add game type'))
    expect(screen.getByText('Merge')).toBeInTheDocument()
  })

  it('merges several duplicate game types into the kept one and moves their matches', () => {
    const repo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    repo.save(buildGameType('keep', 'Belote'))
    repo.save(buildGameType('dup', 'Belote coinchee'))
    repo.save(buildGameType('dup2', 'belote'))
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'dup',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })
    matchRepo.save({
      id: 'm2',
      date: 2000,
      gameTypeId: 'dup2',
      playerScores: [{ playerId: 'p1', score: 7 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })
    render(
      <GameTypeScreen
        addGameType={new AddGameTypeUseCase(repo)}
        updateGameType={new UpdateGameTypeUseCase(repo)}
        getGameTypes={new GetGameTypesUseCase(repo)}
        findGameTypeById={new FindGameTypeByIdUseCase(repo)}
        archiveGameType={new ArchiveGameTypeUseCase(repo)}
        mergeGameTypes={new MergeGameTypesUseCase(repo, matchRepo, new InMemoryMatchDraftRepository())}
      />,
    )

    fireEvent.click(screen.getByText('Merge'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Game to keep'), { target: { value: 'keep' } })
    fireEvent.click(within(dialog).getByText('Belote coinchee', { selector: '.list-item-name' }))
    fireEvent.click(within(dialog).getByText('belote', { selector: '.list-item-name' }))

    expect(within(dialog).getByText('2 matches will move.')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByText('Merge'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(repo.getAll(true).map((gt) => gt.id)).toEqual(['keep'])
    expect(matchRepo.getAll().map((m) => m.gameTypeId)).toEqual(['keep', 'keep'])
  })

  it('warns without blocking when a selected game type does not score the same way', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(buildGameType('keep', 'Belote'))
    repo.save({ ...buildGameType('dup', 'Belote coinchee'), winCondition: 'LOWEST_SCORE' })
    renderScreen(repo)

    fireEvent.click(screen.getByText('Merge'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Game to keep'), { target: { value: 'keep' } })
    fireEvent.click(within(dialog).getByText('Belote coinchee', { selector: '.list-item-name' }))

    expect(within(dialog).getByText(/"Belote" rules will apply/)).toBeInTheDocument()
    expect(within(dialog).getByText('Merge').closest('button')).toBeEnabled()
  })

  it('lists archived game types as merge candidates, marked as archived', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(buildGameType('keep', 'Belote'))
    repo.save({ ...buildGameType('dup', 'Belote coinchee'), active: false })
    renderScreen(repo)

    fireEvent.click(screen.getByText('Merge'))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText('Belote coinchee (archived)', { selector: 'option' })).toBeInTheDocument()
    expect(within(dialog).getByText('(archived)', { selector: '.list-item-subtitle' })).toBeInTheDocument()
  })
})
