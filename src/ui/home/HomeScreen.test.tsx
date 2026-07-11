import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'

function buildProps(overrides: Partial<HomeScreenProps> = {}) {
  const playerRepo = new InMemoryPlayerRepository()
  const matchRepo = new InMemoryMatchRepository()
  const gameTypeRepo = new InMemoryGameTypeRepository()
  const addGameTypeUseCase = new AddGameTypeUseCase(gameTypeRepo)
  const getGameTypesUseCase = new GetGameTypesUseCase(gameTypeRepo)

  const onStartGame = vi.fn()
  const props: HomeScreenProps = {
    addPlayer: new AddPlayerUseCase(playerRepo),
    getPlayers: new GetPlayersUseCase(playerRepo),
    getPlayerStats: new GetPlayerStatsUseCase(matchRepo, gameTypeRepo),
    deletePlayer: new DeletePlayerUseCase(playerRepo),
    renamePlayerUseCase: new RenamePlayerUseCase(playerRepo),
    getGameTypes: () => getGameTypesUseCase.invoke(),
    onAddGameType: (name, winCondition) => addGameTypeUseCase.invoke(name, winCondition),
    onStartGame,
    ...overrides,
  }
  return { props, playerRepo, matchRepo, gameTypeRepo, onStartGame }
}

describe('HomeScreen', () => {
  it('shows the onboarding guide when there are no players and no matches', () => {
    const { props } = buildProps()
    render(<HomeScreen {...props} />)

    expect(screen.getByText('Getting started')).toBeInTheDocument()
    expect(screen.getByText('No players yet. Add one above.')).toBeInTheDocument()
  })

  it('adds a player and hides the onboarding guide', () => {
    const { props } = buildProps()
    render(<HomeScreen {...props} />)

    fireEvent.change(screen.getByPlaceholderText('Player name'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('Add'))

    expect(screen.getByText('Alice', { selector: '.list-item-name' })).toBeInTheDocument()
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Player name')).toHaveValue('')
  })

  it('shows a validation error for a blank player name', () => {
    const { props } = buildProps()
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByText('Add'))

    expect(screen.getByText('name: Player name must not be blank')).toBeInTheDocument()
  })

  it('requires at least 2 selected players before enabling New Match', () => {
    const { props, playerRepo } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    render(<HomeScreen {...props} />)

    expect(screen.getByText('0/2 players selected')).toBeInTheDocument()
    const newMatchButton = screen.getByText('▶ New Match').closest('button')!
    expect(newMatchButton).toBeDisabled()

    fireEvent.click(screen.getByText('Alice', { selector: '.list-item-name' }))
    expect(screen.getByText('1/2 players selected')).toBeInTheDocument()
    expect(newMatchButton).toBeDisabled()

    fireEvent.click(screen.getByText('Bob', { selector: '.list-item-name' }))
    expect(screen.queryByText(/players selected/)).not.toBeInTheDocument()
    expect(newMatchButton).not.toBeDisabled()
  })

  it('selecting a game and starting a match calls onStartGame with the selected players', () => {
    const { props, playerRepo, gameTypeRepo, onStartGame } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Chess',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByText('Alice', { selector: '.list-item-name' }))
    fireEvent.click(screen.getByText('Bob', { selector: '.list-item-name' }))
    fireEvent.click(screen.getByText('▶ New Match'))

    expect(screen.getByText('Select a game')).toBeInTheDocument()

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'gt1' } })
    fireEvent.click(within(dialog).getByText('Start match'))

    expect(onStartGame).toHaveBeenCalledWith('gt1', ['p1', 'p2'])
  })

  it('shows an error when starting a match without selecting a game', () => {
    const { props, playerRepo, gameTypeRepo } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Chess',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByText('Alice', { selector: '.list-item-name' }))
    fireEvent.click(screen.getByText('Bob', { selector: '.list-item-name' }))
    fireEvent.click(screen.getByText('▶ New Match'))
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Start match'))

    expect(screen.getByText('Please select a game')).toBeInTheDocument()
  })

  it('creates a game type inline from the game selection modal', () => {
    const { props, playerRepo } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByText('Alice', { selector: '.list-item-name' }))
    fireEvent.click(screen.getByText('Bob', { selector: '.list-item-name' }))
    fireEvent.click(screen.getByText('▶ New Match'))

    expect(screen.getByText('No game types yet. Add one.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('＋'))
    fireEvent.change(screen.getByPlaceholderText('Game name'), { target: { value: 'Chess' } })
    fireEvent.click(screen.getByText('Add game'))

    expect(within(screen.getByRole('dialog')).getByText('Chess')).toBeInTheDocument()
  })

  it('deletes a player through the confirmation modal, preserving the name by default', () => {
    const { props, playerRepo } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByTitle('Delete'))
    expect(screen.getByText('Delete Alice?')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Delete', { selector: 'button' }))

    expect(screen.getByText('No players yet. Add one above.')).toBeInTheDocument()
    expect(playerRepo.getAll(true)[0].name).toBe('Alice')
    expect(playerRepo.getAll(true)[0].active).toBe(false)
  })

  it('deletes a player with the anonymize checkbox checked', () => {
    const { props, playerRepo } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByTitle('Delete'))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText('Delete', { selector: 'button' }))

    expect(playerRepo.getAll(true)[0].name).toBe('')
  })

  it('renames a player', () => {
    const { props, playerRepo } = buildProps()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    render(<HomeScreen {...props} />)

    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByText('Rename Alice')).toBeInTheDocument()

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByDisplayValue('Alice'), { target: { value: 'Alicia' } })
    fireEvent.click(within(dialog).getByText('Confirm'))

    expect(screen.getByText('Alicia', { selector: '.list-item-name' })).toBeInTheDocument()
  })

  it('shows the resume-draft banner and calls onResumeDraft', () => {
    const matchDraftRepository = new InMemoryMatchDraftRepository()
    matchDraftRepository.save({ gameTypeId: 'gt1', playerIds: ['p1', 'p2'], rounds: [], updatedAt: 1000 })
    const onResumeDraft = vi.fn()
    const { props } = buildProps({ matchDraftRepository, onResumeDraft })
    render(<HomeScreen {...props} />)

    expect(screen.getByText('Resume match in progress')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Resume match in progress'))

    expect(onResumeDraft).toHaveBeenCalledWith('gt1', ['p1', 'p2'])
  })
})
