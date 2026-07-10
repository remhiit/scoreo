import type { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import type { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import type { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import type { TieBreakRule, WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import type { GameTypeState } from './gameTypeTypes'

export type GameTypeAction =
  | { type: 'loaded'; gameTypes: GameType[] }
  | { type: 'updateName'; name: string }
  | { type: 'selectWinCondition'; winCondition: WinCondition }
  | { type: 'updateTieBreakRule'; rule: TieBreakRule }
  | { type: 'updateTieBreakCondition'; condition: WinCondition }
  | { type: 'updateTieBreakLabel'; label: string }
  | { type: 'selectGame'; id: string }
  | { type: 'deselectGame' }
  | { type: 'addSucceeded'; gameTypes: GameType[] }
  | { type: 'addFailed'; error: string }
  | { type: 'editGameType'; gameType: GameType }
  | { type: 'cancelEdit' }
  | { type: 'updateSucceeded'; gameTypes: GameType[] }
  | { type: 'updateFailed'; error: string }
  | { type: 'showArchiveConfirm'; gameTypeId: string }
  | { type: 'archiveSucceeded'; gameTypes: GameType[] }
  | { type: 'archiveFailed'; error: string }
  | { type: 'dismissArchiveConfirm' }

function resetForm(state: GameTypeState, gameTypes: GameType[]): GameTypeState {
  return {
    ...state,
    gameTypes,
    inputName: '',
    selectedWinCondition: 'HIGHEST_SCORE',
    selectedTieBreakRule: 'NONE',
    selectedTieBreakCondition: 'HIGHEST_SCORE',
    selectedTieBreakLabel: undefined,
    editingGameId: undefined,
    error: undefined,
  }
}

export function gameTypeReducer(state: GameTypeState, action: GameTypeAction): GameTypeState {
  switch (action.type) {
    case 'loaded':
      return { ...state, gameTypes: action.gameTypes }
    case 'updateName':
      return { ...state, inputName: action.name, error: undefined }
    case 'selectWinCondition':
      return { ...state, selectedWinCondition: action.winCondition }
    case 'updateTieBreakRule':
      return { ...state, selectedTieBreakRule: action.rule }
    case 'updateTieBreakCondition':
      return { ...state, selectedTieBreakCondition: action.condition }
    case 'updateTieBreakLabel':
      return { ...state, selectedTieBreakLabel: action.label.trim() === '' ? undefined : action.label }
    case 'selectGame':
      return { ...state, selectedGameId: action.id }
    case 'deselectGame':
      return { ...state, selectedGameId: undefined }
    case 'addSucceeded':
      return resetForm(state, action.gameTypes)
    case 'addFailed':
      return { ...state, error: action.error }
    case 'editGameType':
      return {
        ...state,
        inputName: action.gameType.name,
        selectedWinCondition: action.gameType.winCondition,
        selectedTieBreakRule: action.gameType.tieBreakRule,
        selectedTieBreakCondition: action.gameType.tieBreakCondition,
        selectedTieBreakLabel: action.gameType.tieBreakLabel ?? undefined,
        editingGameId: action.gameType.id,
        error: undefined,
      }
    case 'cancelEdit':
      return resetForm(state, state.gameTypes)
    case 'updateSucceeded':
      return resetForm(state, action.gameTypes)
    case 'updateFailed':
      return { ...state, error: action.error }
    case 'showArchiveConfirm':
      return { ...state, archiveConfirmGameTypeId: action.gameTypeId }
    case 'archiveSucceeded':
      return { ...state, gameTypes: action.gameTypes, archiveConfirmGameTypeId: undefined, selectedGameId: undefined }
    case 'archiveFailed':
      return { ...state, error: action.error }
    case 'dismissArchiveConfirm':
      return { ...state, archiveConfirmGameTypeId: undefined }
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadGameTypes(getGameTypes: GetGameTypesUseCase): GameType[] {
  return getGameTypes.invoke()
}

/** Mirrors GameTypeHandler's AddGameType try/catch, using the current form fields. */
export function submitAddGameType(
  addGameTypeUseCase: AddGameTypeUseCase,
  getGameTypes: GetGameTypesUseCase,
  state: GameTypeState,
): { gameTypes: GameType[] } | { error: string } {
  try {
    addGameTypeUseCase.invoke(state.inputName.trim(), state.selectedWinCondition, {
      tieBreakRule: state.selectedTieBreakRule,
      tieBreakCondition: state.selectedTieBreakCondition,
      tieBreakLabel: state.selectedTieBreakLabel ?? null,
    })
    return { gameTypes: getGameTypes.invoke() }
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

export function resolveGameTypeForEdit(findGameTypeById: FindGameTypeByIdUseCase, id: string): GameType | undefined {
  return findGameTypeById.invoke(id)
}

export function submitUpdateGameType(
  updateGameTypeUseCase: UpdateGameTypeUseCase,
  getGameTypes: GetGameTypesUseCase,
  gameType: GameType,
): { gameTypes: GameType[] } | { error: string } {
  try {
    updateGameTypeUseCase.invoke(gameType)
    return { gameTypes: getGameTypes.invoke() }
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

export function submitArchiveGameType(
  archiveGameTypeUseCase: ArchiveGameTypeUseCase,
  getGameTypes: GetGameTypesUseCase,
  gameTypeId: string,
): { gameTypes: GameType[] } | { error: string } {
  try {
    archiveGameTypeUseCase.invoke(gameTypeId)
    return { gameTypes: getGameTypes.invoke() }
  } catch (e) {
    return { error: errorMessage(e) }
  }
}
