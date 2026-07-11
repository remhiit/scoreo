import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { GameTypeScreen } from './GameTypeScreen'

function renderScreen(repo = new InMemoryGameTypeRepository()) {
  return render(
    <GameTypeScreen
      addGameType={new AddGameTypeUseCase(repo)}
      updateGameType={new UpdateGameTypeUseCase(repo)}
      getGameTypes={new GetGameTypesUseCase(repo)}
      findGameTypeById={new FindGameTypeByIdUseCase(repo)}
      archiveGameType={new ArchiveGameTypeUseCase(repo)}
    />,
  )
}

function nameInput() {
  return screen.getByPlaceholderText('Game name')
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

    fireEvent.click(screen.getByTitle('View details'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Win condition:')).toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('dialog')).getByText('Edit'))

    expect(screen.getByText('Edit Belote')).toBeInTheDocument()
  })

  it('edits a game type via the Edit action and saves the new tie-break rule', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByText('Edit Belote')).toBeInTheDocument()

    const editDialog = screen.getByRole('dialog')
    fireEvent.change(within(editDialog).getByDisplayValue('No tie-break'), {
      target: { value: 'MANUAL_SELECTION' },
    })
    fireEvent.click(within(editDialog).getByText('Save changes'))

    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('View details'))
    expect(within(screen.getByRole('dialog')).getByText('Manual selection')).toBeInTheDocument()
  })

  it('cancelling edit restores the add form without changes', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByTitle('Edit'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()
    expect(nameInput()).toHaveValue('')
  })

  it('archives a game type through the confirmation dialog', () => {
    renderScreen()
    fireEvent.change(nameInput(), { target: { value: 'Belote' } })
    fireEvent.click(screen.getByText('Add game type'))

    fireEvent.click(screen.getByTitle('Delete'))
    expect(screen.getByText('Archive Belote?')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('Belote', { selector: '.list-item-name' })).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Delete'))
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
        showTitle={false}
      />,
    )

    expect(screen.queryByText('Game Types')).not.toBeInTheDocument()
  })
})
