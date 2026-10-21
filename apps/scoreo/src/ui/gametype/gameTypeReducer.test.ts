import { describe, expect, it } from 'vitest'
import { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import { MergeGameTypesUseCase } from '../../application/mergeGameTypesUseCase'
import { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import {
  gameTypeReducer,
  loadGameTypes,
  gameTypeHasMatches,
  resolveGameTypeForEdit,
  scoringModeChangeWarning,
  showsScoringModeChoice,
  submitAddGameType,
  submitArchiveGameType,
  submitMergeGameTypes,
  submitUpdateGameType,
  type LoadedGameTypes,
} from './gameTypeReducer'
import { initialGameTypeState, type GameTypeState } from './gameTypeTypes'
import type { GameType } from '../../domain/model/gameType'

function buildUseCases(
  repo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
) {
  return {
    repo,
    matchRepo,
    addGameType: new AddGameTypeUseCase(repo),
    updateGameType: new UpdateGameTypeUseCase(repo, matchRepo),
    getGameTypes: new GetGameTypesUseCase(repo),
    findGameTypeById: new FindGameTypeByIdUseCase(repo),
    archiveGameType: new ArchiveGameTypeUseCase(repo),
    mergeGameTypes: new MergeGameTypesUseCase(repo, matchRepo, new InMemoryMatchDraftRepository()),
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
    : gameTypeReducer(withName, { type: 'addSucceeded', ...result })
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

  it('selectScoringMode updates selectedScoringMode and defaults to POINTS', () => {
    expect(initialGameTypeState.selectedScoringMode).toBe('POINTS')
    const state = gameTypeReducer(initialGameTypeState, {
      type: 'selectScoringMode',
      scoringMode: 'ROUNDS_WON',
    })
    expect(state.selectedScoringMode).toBe('ROUNDS_WON')
  })

  it('adds a ROUNDS_WON game type, then edits and updates it', () => {
    const useCases = buildUseCases()
    let state = gameTypeReducer(initialGameTypeState, {
      type: 'selectScoringMode',
      scoringMode: 'ROUNDS_WON',
    })
    state = add(state, useCases, 'Tarot')
    expect(state.gameTypes[0].scoringMode).toBe('ROUNDS_WON')
    expect(state.selectedScoringMode).toBe('POINTS')

    state = gameTypeReducer(state, {
      type: 'editGameType',
      gameType: state.gameTypes[0],
      hasMatches: false,
    })
    expect(state.selectedScoringMode).toBe('ROUNDS_WON')

    state = gameTypeReducer(state, { type: 'selectScoringMode', scoringMode: 'POINTS' })
    const result = submitUpdateGameType(useCases.updateGameType, useCases.getGameTypes, {
      ...state.gameTypes[0],
      scoringMode: state.selectedScoringMode,
    })
    expect('error' in result).toBe(false)
    expect(useCases.repo.getAll()[0].scoringMode).toBe('POINTS')
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
    const withoutName = submitAddGameType(
      useCases.addGameType,
      useCases.getGameTypes,
      initialGameTypeState,
    )
    expect('error' in withoutName && withoutName.error).toBe(
      'name: Game type name must not be blank',
    )
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
    const state = gameTypeReducer(initialGameTypeState, {
      type: 'updateTieBreakLabel',
      label: 'Points',
    })
    expect(state.selectedTieBreakLabel).toBe('Points')
  })

  it('updateTieBreakLabel with a blank string sets it to undefined', () => {
    let state = gameTypeReducer(initialGameTypeState, {
      type: 'updateTieBreakLabel',
      label: 'Points',
    })
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
    state =
      'error' in result
        ? gameTypeReducer(state, { type: 'addFailed', error: result.error })
        : gameTypeReducer(state, { type: 'addSucceeded', ...result })

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
    state = gameTypeReducer(state, { type: 'editGameType', gameType, hasMatches: false })

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
    state = gameTypeReducer(state, { type: 'addSucceeded', ...(result as LoadedGameTypes) })

    const gameTypeId = state.gameTypes[0].id
    const gameType = resolveGameTypeForEdit(useCases.findGameTypeById, gameTypeId)!
    state = gameTypeReducer(state, { type: 'editGameType', gameType, hasMatches: false })

    expect(state.selectedTieBreakRule).toBe('SECONDARY_SCORE')
    expect(state.selectedTieBreakCondition).toBe('LOWEST_SCORE')
    expect(state.selectedTieBreakLabel).toBe('Handicap')
  })

  it('cancelEdit clears all input fields and resets editingGameId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    const gameType = resolveGameTypeForEdit(useCases.findGameTypeById, gameTypeId)!
    state = gameTypeReducer(state, { type: 'editGameType', gameType, hasMatches: false })
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
    const updated = {
      ...original,
      name: 'Belote Updated',
      tieBreakRule: 'MANUAL_SELECTION' as const,
    }
    state = gameTypeReducer(state, { type: 'editGameType', gameType: original, hasMatches: false })
    const result = submitUpdateGameType(useCases.updateGameType, useCases.getGameTypes, updated)
    state =
      'error' in result
        ? gameTypeReducer(state, { type: 'updateFailed', error: result.error })
        : gameTypeReducer(state, { type: 'updateSucceeded', ...result })

    expect(state.gameTypes).toHaveLength(1)
    expect(state.gameTypes[0].name).toBe('Belote Updated')
    expect(state.gameTypes[0].tieBreakRule).toBe('MANUAL_SELECTION')
  })

  it('updateGameType resets edit mode', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameType = state.gameTypes[0]
    state = gameTypeReducer(state, { type: 'editGameType', gameType, hasMatches: false })
    const result = submitUpdateGameType(useCases.updateGameType, useCases.getGameTypes, gameType)
    state = gameTypeReducer(state, { type: 'updateSucceeded', ...(result as LoadedGameTypes) })

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

    const result = submitArchiveGameType(
      useCases.archiveGameType,
      useCases.getGameTypes,
      gameTypeIdToArchive,
    )
    state =
      'error' in result
        ? gameTypeReducer(state, { type: 'archiveFailed', error: result.error })
        : gameTypeReducer(state, { type: 'archiveSucceeded', ...result })

    expect(state.gameTypes).toHaveLength(1)
    expect(state.gameTypes[0].name).toBe('Golf')
  })

  it('archiving a game type clears archiveConfirmGameTypeId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    state = gameTypeReducer(state, { type: 'showArchiveConfirm', gameTypeId })
    const result = submitArchiveGameType(
      useCases.archiveGameType,
      useCases.getGameTypes,
      gameTypeId,
    )
    state = gameTypeReducer(state, { type: 'archiveSucceeded', ...(result as LoadedGameTypes) })

    expect(state.archiveConfirmGameTypeId).toBeUndefined()
  })

  it('archiving a game type clears selectedGameId', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')

    const gameTypeId = state.gameTypes[0].id
    state = gameTypeReducer(state, { type: 'selectGame', id: gameTypeId })
    expect(state.selectedGameId).toBe(gameTypeId)

    const result = submitArchiveGameType(
      useCases.archiveGameType,
      useCases.getGameTypes,
      gameTypeId,
    )
    state = gameTypeReducer(state, { type: 'archiveSucceeded', ...(result as LoadedGameTypes) })

    expect(state.selectedGameId).toBeUndefined()
  })
  it('loading also exposes archived game types as merge candidates', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')
    state = add(state, useCases, 'Belote coinchee')
    const archivedId = state.gameTypes[1].id
    const archived = submitArchiveGameType(
      useCases.archiveGameType,
      useCases.getGameTypes,
      archivedId,
    )
    state = gameTypeReducer(state, { type: 'archiveSucceeded', ...(archived as LoadedGameTypes) })

    expect(state.gameTypes).toHaveLength(1)
    expect(state.allGameTypes).toHaveLength(2)
  })

  it('showMergeDialog opens the dialog with nothing picked', () => {
    let state = gameTypeReducer(initialGameTypeState, { type: 'toggleMergeDuplicate', id: 'stale' })
    state = gameTypeReducer(state, { type: 'showMergeDialog' })

    expect(state.showMergeDialog).toBe(true)
    expect(state.mergeKeptId).toBeUndefined()
    expect(state.mergeDuplicateIds).toEqual([])
  })

  it('dismissMergeDialog closes the dialog and drops the selection', () => {
    let state = gameTypeReducer(initialGameTypeState, { type: 'showMergeDialog' })
    state = gameTypeReducer(state, { type: 'selectMergeKept', id: 'gt1' })
    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: 'gt2' })
    state = gameTypeReducer(state, { type: 'dismissMergeDialog' })

    expect(state.showMergeDialog).toBe(false)
    expect(state.mergeKeptId).toBeUndefined()
    expect(state.mergeDuplicateIds).toEqual([])
  })

  it('toggleMergeDuplicate ticks and unticks a duplicate, keeping the others', () => {
    let state = gameTypeReducer(initialGameTypeState, { type: 'toggleMergeDuplicate', id: 'gt2' })
    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: 'gt3' })
    expect(state.mergeDuplicateIds).toEqual(['gt2', 'gt3'])

    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: 'gt2' })
    expect(state.mergeDuplicateIds).toEqual(['gt3'])
  })

  it('picking an already ticked duplicate as the kept game type unticks it', () => {
    let state = gameTypeReducer(initialGameTypeState, { type: 'toggleMergeDuplicate', id: 'gt2' })
    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: 'gt3' })
    state = gameTypeReducer(state, { type: 'selectMergeKept', id: 'gt2' })

    expect(state.mergeKeptId).toBe('gt2')
    expect(state.mergeDuplicateIds).toEqual(['gt3'])
  })

  it('merging moves the matches, drops every duplicate and closes the dialog', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')
    state = add(state, useCases, 'Belote ')
    state = add(state, useCases, 'belote')
    const [keep, dup, dup2] = state.gameTypes
    useCases.matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: dup.id,
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })
    useCases.matchRepo.save({
      id: 'm2',
      date: 2000,
      gameTypeId: dup2.id,
      playerScores: [{ playerId: 'p1', score: 7 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })
    state = gameTypeReducer(state, { type: 'showMergeDialog' })
    state = gameTypeReducer(state, { type: 'selectMergeKept', id: keep.id })
    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: dup.id })
    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: dup2.id })

    const result = submitMergeGameTypes(useCases.mergeGameTypes, useCases.getGameTypes, state)!
    state = gameTypeReducer(state, { type: 'mergeSucceeded', ...(result as LoadedGameTypes) })

    expect(state.gameTypes.map((gt) => gt.id)).toEqual([keep.id])
    expect(useCases.matchRepo.getAll().map((m) => m.gameTypeId)).toEqual([keep.id, keep.id])
    expect(state.showMergeDialog).toBe(false)
    expect(state.mergeError).toBeUndefined()
  })

  it('a refused merge keeps the dialog open and reports the reason', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')
    state = gameTypeReducer(state, { type: 'showMergeDialog' })
    state = gameTypeReducer(state, { type: 'selectMergeKept', id: state.gameTypes[0].id })
    state = gameTypeReducer(state, { type: 'toggleMergeDuplicate', id: 'ghost' })

    const result = submitMergeGameTypes(useCases.mergeGameTypes, useCases.getGameTypes, state)!
    state = gameTypeReducer(state, {
      type: 'mergeFailed',
      error: (result as { error: string }).error,
    })

    expect(state.showMergeDialog).toBe(true)
    expect(state.mergeError).toBe('GameType ghost not found')
    expect(state.gameTypes).toHaveLength(1)
  })

  it('confirming a merge with no duplicate ticked is a no-op', () => {
    const useCases = buildUseCases()
    const state = gameTypeReducer(initialGameTypeState, { type: 'selectMergeKept', id: 'gt1' })

    expect(
      submitMergeGameTypes(useCases.mergeGameTypes, useCases.getGameTypes, state),
    ).toBeUndefined()
  })

  it('confirming a merge with no kept game type picked is a no-op', () => {
    const useCases = buildUseCases()
    const state = gameTypeReducer(initialGameTypeState, { type: 'toggleMergeDuplicate', id: 'gt1' })

    expect(
      submitMergeGameTypes(useCases.mergeGameTypes, useCases.getGameTypes, state),
    ).toBeUndefined()
  })

  it('loadGameTypes returns the active list and the full one', () => {
    const useCases = buildUseCases()
    let state = add(initialGameTypeState, useCases, 'Belote')
    state = add(state, useCases, 'Tarot')
    useCases.archiveGameType.invoke(state.gameTypes[0].id)

    expect(loadGameTypes(useCases.getGameTypes)).toEqual({
      gameTypes: useCases.repo.getAll(),
      allGameTypes: useCases.repo.getAll(true),
    })
  })
})

describe('scoring mode change warning', () => {
  const tarot: GameType = {
    id: 'gt1',
    name: 'Tarot',
    winCondition: 'HIGHEST_SCORE',
    scoringMode: 'POINTS',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
  }

  function editing(hasMatches: boolean, gameType: GameType = tarot): GameTypeState {
    const loaded = gameTypeReducer(initialGameTypeState, {
      type: 'loaded',
      gameTypes: [gameType],
      allGameTypes: [gameType],
    })
    return gameTypeReducer(loaded, { type: 'editGameType', gameType, hasMatches })
  }

  it('warns when a rounds-won game with matches becomes MANUAL', () => {
    const state = gameTypeReducer(editing(true, { ...tarot, scoringMode: 'ROUNDS_WON' }), {
      type: 'selectWinCondition',
      winCondition: 'MANUAL',
    })
    expect(scoringModeChangeWarning(state)).toBe(true)
  })

  it('warns when only the win condition of a rounds-won game with matches changes', () => {
    const state = gameTypeReducer(editing(true, { ...tarot, scoringMode: 'ROUNDS_WON' }), {
      type: 'selectWinCondition',
      winCondition: 'LOWEST_SCORE',
    })
    expect(scoringModeChangeWarning(state)).toBe(true)
  })

  it('does not warn when only the win condition of a points game changes', () => {
    const state = gameTypeReducer(editing(true), {
      type: 'selectWinCondition',
      winCondition: 'LOWEST_SCORE',
    })
    expect(scoringModeChangeWarning(state)).toBe(false)
  })

  it('hides the scoring mode choice for a module-bound game, which never warns', () => {
    const bound = editing(true, { ...tarot, moduleId: 'skyjo' })
    expect(showsScoringModeChoice(bound)).toBe(false)
    const state = gameTypeReducer(bound, { type: 'selectScoringMode', scoringMode: 'ROUNDS_WON' })
    expect(scoringModeChangeWarning(state)).toBe(false)
  })

  it('shows the scoring mode choice in the add form and for an unbound game', () => {
    expect(showsScoringModeChoice(initialGameTypeState)).toBe(true)
    expect(showsScoringModeChoice(editing(false))).toBe(true)
  })

  it('warns when the mode of a game type that has matches changes', () => {
    const state = gameTypeReducer(editing(true), {
      type: 'selectScoringMode',
      scoringMode: 'ROUNDS_WON',
    })
    expect(scoringModeChangeWarning(state)).toBe(true)
  })

  it('does not warn while the mode is unchanged', () => {
    expect(scoringModeChangeWarning(editing(true))).toBe(false)
  })

  it('does not warn for a game type without matches', () => {
    const state = gameTypeReducer(editing(false), {
      type: 'selectScoringMode',
      scoringMode: 'ROUNDS_WON',
    })
    expect(scoringModeChangeWarning(state)).toBe(false)
  })

  it('does not warn once the win condition is MANUAL, where the mode is hidden', () => {
    let state = gameTypeReducer(editing(true), {
      type: 'selectScoringMode',
      scoringMode: 'ROUNDS_WON',
    })
    state = gameTypeReducer(state, { type: 'selectWinCondition', winCondition: 'MANUAL' })
    expect(scoringModeChangeWarning(state)).toBe(false)
  })

  it('forgets the matches once the edit is cancelled', () => {
    const state = gameTypeReducer(editing(true), { type: 'cancelEdit' })
    expect(state.editingGameHasMatches).toBe(false)
  })

  it('detects whether a game type has matches', () => {
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      gameTypeId: 'gt1',
      date: 1000,
      playerScores: [{ playerId: 'p1', score: 3 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })
    const getMatches = new GetMatchesUseCase(matchRepo)
    expect(gameTypeHasMatches(getMatches, 'gt1')).toBe(true)
    expect(gameTypeHasMatches(getMatches, 'other')).toBe(false)
  })
})
