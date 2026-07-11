import { describe, expect, it } from 'vitest'
import { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import {
  gameTypeReducer,
  resolveGameTypeForEdit,
  submitAddGameType,
  submitArchiveGameType,
  submitUpdateGameType,
} from './gameTypeReducer'
import { initialGameTypeState, type GameTypeState } from './gameTypeTypes'

function buildUseCases(repo = new InMemoryGameTypeRepository()) {
  return {
    repo,
    addGameType: new AddGameTypeUseCase(repo),
    updateGameType: new UpdateGameTypeUseCase(repo),
    getGameTypes: new GetGameTypesUseCase(repo),
    findGameTypeById: new FindGameTypeByIdUseCase(repo),
    archiveGameType: new ArchiveGameTypeUseCase(repo),
  }
}

function add(
  state: GameTypeState,
  useCases: ReturnType<typeof buildUseCases>,
  name: string,
): GameTypeState {
  const withName = gameTypeReducer(state, { type: 'updateName', name })
  const result = submitAddGameType(useCases.addGameType, useCases.getGameTypes, withName)
  return 'error' in result
    ? gameTypeReducer(withName, { type: 'addFailed', error: result.error })
    : gameTypeReducer(withName, { type: 'addSucceeded', gameTypes: result.gameTypes })
}

describe('gameTypeReducer', () => {
  it('initial state has empty game type list and defaults', () => {
    const state = initialGameTypeState
    expect(state.gameTypes).toEqual([])
    expect(state.inputName).toBe('')
    expect(state.selectedWinCondition).toBe('HIGHEST_SCORE')
    expect(state.selectedTieBreakRule).toBe('NONE')
    expect(state.selectedTieBreakCondition).toBe('HIGHEST_SCORE')
    expect(state.selectedTieBreakLabel).toBeUndefined()
    expect(state.editingGameId).toBeUndefined()
    expect(state.error).toBeUndefined()
  })

  it('updateName updates inputName and clears the error', () => {
    let state = gameTypeReducer(initialGameTypeState, { type: 'addFailed', error: 'boom' })
    state = gameTypeReducer(state, { type: 'updateName', name: 'Belote' })
    expect(state.inputName).toBe('Belote')
    expect(state.error).toBeUndefined()
  })

  it('selectWinCondition updates selectedWinCondition', () => {
    const state = gameTypeReducer(initialGameTypeState, {
      type: 'selectWinCondition',
      winCondition: 'LOWEST_SCORE',
    })
    expect(state.selectedWinCondition).toBe('LOWEST_SCORE')
  })

  it('adding a valid name adds the game type and clears the input', () => {
    const useCases = buildUseCases()
    const state = add(initialGameTypeState, useCases, 'Belote')

    expect(state.gameTypes).toHaveLength(1)
    expect(state.gameTypes[0].name).toBe('Belote')
    expect(state.inputName).toBe('')
    expect(state.error).toBeUndefined()
  })

  it('adding a blank name sets an error and does not add', () => {
    const useCases = buildUseCases()
    const state = add(initialGameTypeState, useCases, '   ')

    expect(state.gameTypes).toEqual([])
    expect(state.error).toBe('name: Game type name must not be blank')
  })

  it('adding an empty name sets an error', () => {
    const useCases = buildUseCases()
    const withoutName = submitAddGameType(useCases.addGameType, useCases.getGameTypes, initialGameTypeState)
    expect('error' in withoutName && withoutName.error).toBe('name: Game type name must not be blank')
  })

  it('adding multiple game types accumulates in state', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')
    state = add(state, useCases, 'Golf')

    expect(state.gameTypes).toHaveLength(2)
  })

  it('updateTieBreakRule updates selectedTieBreakRule', () => {
    const state = gameTypeReducer(initialGameTypeState, {
      type: 'updateTieBreakRule',
      rule: 'SECONDARY_SCORE',
    })
    expect(state.selectedTieBreakRule).toBe('SECONDARY_SCORE')
  })

  it('updateTieBreakCondition updates selectedTieBreakCondition', () => {
    const state = gameTypeReducer(initialGameTypeState, {
      type: 'updateTieBreakCondition',
      condition: 'LOWEST_SCORE',
    })
    expect(state.selectedTieBreakCondition).toBe('LOWEST_SCORE')
  })

  it('updateTieBreakLabel updates selectedTieBreakLabel', () => {
    const state = gameTypeReducer(initialGameTypeState, { type: 'updateTieBreakLabel', label: 'Points' })
    expect(state.selectedTieBreakLabel).toBe('Points')
  })

  it('updateTieBreakLabel with a blank string sets it to undefined', () => {
    let state = gameTypeReducer(initialGameTypeState, { type: 'updateTieBreakLabel', label: 'Points' })
    state = gameTypeReducer(state, { type: 'updateTieBreakLabel', label: '   ' })
    expect(state.selectedTieBreakLabel).toBeUndefined()
  })

  it('adding a game type includes the tie-break configuration', () => {
    const useCases = buildUseCases()
    let state = gameTypeReducer(initialGameTypeState, { type: 'updateName', name: 'Golf' })
    state = gameTypeReducer(state, { type: 'updateTieBreakRule', rule: 'SECONDARY_SCORE' })
    state = gameTypeReducer(state, { type: 'updateTieBreakCondition', condition: 'LOWEST_SCORE' })
    state = gameTypeReducer(state, { type: 'updateTieBreakLabel', label: 'Handicap' })
    const result = submitAddGameType(useCases.addGameType, useCases.getGameTypes, state)
    state = 'error' in result
      ? gameTypeReducer(state, { type: 'addFailed', error: result.error })
      : gameTypeReducer(state, { type: 'addSucceeded', gameTypes: result.gameTypes })

    expect(state.gameTypes).toHaveLength(1)
    const gameType = state.gameTypes[0]
    expect(gameType.name).toBe('Golf')
    expect(gameType.tieBreakRule).toBe('SECONDARY_SCORE')
    expect(gameType.tieBreakCondition).toBe('LOWEST_SCORE')
    expect(gameType.tieBreakLabel).toBe('Handicap')
  })

  it('editGameType pre-fills state with the game type values', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    const gameType = resolveGameTypeForEdit(useCases.findGameTypeById, gameTypeId)!
    state = gameTypeReducer(state, { type: 'editGameType', gameType })

    expect(state.inputName).toBe('Belote')
    expect(state.editingGameId).toBe(gameTypeId)
  })

  it('editGameType pre-fills the tie-break configuration', () => {
    const useCases = buildUseCases()
    let state = gameTypeReducer(initialGameTypeState, { type: 'updateName', name: 'Golf' })
    state = gameTypeReducer(state, { type: 'updateTieBreakRule', rule: 'SECONDARY_SCORE' })
    state = gameTypeReducer(state, { type: 'updateTieBreakCondition', condition: 'LOWEST_SCORE' })
    state = gameTypeReducer(state, { type: 'updateTieBreakLabel', label: 'Handicap' })
    const result = submitAddGameType(useCases.addGameType, useCases.getGameTypes, state)
    state = gameTypeReducer(state, { type: 'addSucceeded', gameTypes: (result as { gameTypes: typeof state.gameTypes }).gameTypes })

    const gameTypeId = state.gameTypes[0].id
    const gameType = resolveGameTypeForEdit(useCases.findGameTypeById, gameTypeId)!
    state = gameTypeReducer(state, { type: 'editGameType', gameType })

    expect(state.selectedTieBreakRule).toBe('SECONDARY_SCORE')
    expect(state.selectedTieBreakCondition).toBe('LOWEST_SCORE')
    expect(state.selectedTieBreakLabel).toBe('Handicap')
  })

  it('cancelEdit clears all input fields and resets editingGameId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    const gameType = resolveGameTypeForEdit(useCases.findGameTypeById, gameTypeId)!
    state = gameTypeReducer(state, { type: 'editGameType', gameType })
    expect(state.editingGameId).toBe(gameTypeId)

    state = gameTypeReducer(state, { type: 'cancelEdit' })

    expect(state.inputName).toBe('')
    expect(state.editingGameId).toBeUndefined()
    expect(state.selectedTieBreakRule).toBe('NONE')
    expect(state.selectedTieBreakLabel).toBeUndefined()
  })

  it('updateGameType modifies the existing game type', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const original = state.gameTypes[0]
    const updated = { ...original, name: 'Belote Updated', tieBreakRule: 'MANUAL_SELECTION' as const }
    state = gameTypeReducer(state, { type: 'editGameType', gameType: original })
    const result = submitUpdateGameType(useCases.updateGameType, useCases.getGameTypes, updated)
    state = 'error' in result
      ? gameTypeReducer(state, { type: 'updateFailed', error: result.error })
      : gameTypeReducer(state, { type: 'updateSucceeded', gameTypes: result.gameTypes })

    expect(state.gameTypes).toHaveLength(1)
    expect(state.gameTypes[0].name).toBe('Belote Updated')
    expect(state.gameTypes[0].tieBreakRule).toBe('MANUAL_SELECTION')
  })

  it('updateGameType resets edit mode', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameType = state.gameTypes[0]
    state = gameTypeReducer(state, { type: 'editGameType', gameType })
    const result = submitUpdateGameType(useCases.updateGameType, useCases.getGameTypes, gameType)
    state = gameTypeReducer(state, { type: 'updateSucceeded', gameTypes: (result as { gameTypes: typeof state.gameTypes }).gameTypes })

    expect(state.editingGameId).toBeUndefined()
    expect(state.inputName).toBe('')
  })

  it('showArchiveConfirm sets archiveConfirmGameTypeId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    state = gameTypeReducer(state, { type: 'showArchiveConfirm', gameTypeId })

    expect(state.archiveConfirmGameTypeId).toBe(gameTypeId)
  })

  it('dismissArchiveConfirm clears archiveConfirmGameTypeId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    state = gameTypeReducer(state, { type: 'showArchiveConfirm', gameTypeId })
    expect(state.archiveConfirmGameTypeId).toBe(gameTypeId)

    state = gameTypeReducer(state, { type: 'dismissArchiveConfirm' })
    expect(state.archiveConfirmGameTypeId).toBeUndefined()
  })

  it('archiving a game type removes it from the active list', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')
    state = add(state, useCases, 'Golf')

    expect(state.gameTypes).toHaveLength(2)
    const gameTypeIdToArchive = state.gameTypes[0].id

    const result = submitArchiveGameType(useCases.archiveGameType, useCases.getGameTypes, gameTypeIdToArchive)
    state = 'error' in result
      ? gameTypeReducer(state, { type: 'archiveFailed', error: result.error })
      : gameTypeReducer(state, { type: 'archiveSucceeded', gameTypes: result.gameTypes })

    expect(state.gameTypes).toHaveLength(1)
    expect(state.gameTypes[0].name).toBe('Golf')
  })

  it('archiving a game type clears archiveConfirmGameTypeId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    state = gameTypeReducer(state, { type: 'showArchiveConfirm', gameTypeId })
    const result = submitArchiveGameType(useCases.archiveGameType, useCases.getGameTypes, gameTypeId)
    state = gameTypeReducer(state, { type: 'archiveSucceeded', gameTypes: (result as { gameTypes: typeof state.gameTypes }).gameTypes })

    expect(state.archiveConfirmGameTypeId).toBeUndefined()
  })

  it('archiving a game type clears selectedGameId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    state = gameTypeReducer(state, { type: 'selectGame', id: gameTypeId })
    expect(state.selectedGameId).toBe(gameTypeId)

    const result = submitArchiveGameType(useCases.archiveGameType, useCases.getGameTypes, gameTypeId)
    state = gameTypeReducer(state, { type: 'archiveSucceeded', gameTypes: (result as { gameTypes: typeof state.gameTypes }).gameTypes })

    expect(state.selectedGameId).toBeUndefined()
  })
})
