import type { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import type { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import type { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { MergeGameTypesUseCase } from '../../application/mergeGameTypesUseCase'
import type { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import type { TieBreakRule, WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import type { GameTypeState } from './gameTypeTypes'

/**
 * The two views of the catalogue every reload needs: the active list the screen
 * renders, and the full list (archived included) the merge dialog picks from.
 */
export interface LoadedGameTypes {
  gameTypes: GameType[]
  allGameTypes: GameType[]
}

export type GameTypeAction =
  | ({ type: 'loaded' } & LoadedGameTypes)
  | { type: 'updateName'; name: string }
  | { type: 'selectWinCondition'; winCondition: WinCondition }
  | { type: 'updateTieBreakRule'; rule: TieBreakRule }
  | { type: 'updateTieBreakCondition'; condition: WinCondition }
  | { type: 'updateTieBreakLabel'; label: string }
  | { type: 'selectGame'; id: string }
  | { type: 'deselectGame' }
  | ({ type: 'addSucceeded' } & LoadedGameTypes)
  | { type: 'addFailed'; error: string }
  | { type: 'editGameType'; gameType: GameType }
  | { type: 'cancelEdit' }
  | ({ type: 'updateSucceeded' } & LoadedGameTypes)
  | { type: 'updateFailed'; error: string }
  | { type: 'showArchiveConfirm'; gameTypeId: string }
  | ({ type: 'archiveSucceeded' } & LoadedGameTypes)
  | { type: 'archiveFailed'; error: string }
  | { type: 'dismissArchiveConfirm' }
  | { type: 'showMergeDialog' }
  | { type: 'dismissMergeDialog' }
  | { type: 'selectMergeDuplicate'; id: string | undefined }
  | { type: 'selectMergeKept'; id: string | undefined }
  | ({ type: 'mergeSucceeded' } & LoadedGameTypes)
  | { type: 'mergeFailed'; error: string }

const CLOSED_MERGE_DIALOG = {
  showMergeDialog: false,
  mergeDuplicateId: undefined,
  mergeKeptId: undefined,
  mergeError: undefined,
} as const

function resetForm(state: GameTypeState, loaded: LoadedGameTypes): GameTypeState {
  return {
    ...state,
    ...loaded,
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
      return { ...state, gameTypes: action.gameTypes, allGameTypes: action.allGameTypes }
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
      return resetForm(state, action)
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
      return resetForm(state, { gameTypes: state.gameTypes, allGameTypes: state.allGameTypes })
    case 'updateSucceeded':
      return resetForm(state, action)
    case 'updateFailed':
      return { ...state, error: action.error }
    case 'showArchiveConfirm':
      return { ...state, archiveConfirmGameTypeId: action.gameTypeId }
    case 'archiveSucceeded':
      return {
        ...state,
        gameTypes: action.gameTypes,
        allGameTypes: action.allGameTypes,
        archiveConfirmGameTypeId: undefined,
        selectedGameId: undefined,
      }
    case 'archiveFailed':
      return { ...state, error: action.error }
    case 'dismissArchiveConfirm':
      return { ...state, archiveConfirmGameTypeId: undefined }
    case 'showMergeDialog':
      return { ...state, ...CLOSED_MERGE_DIALOG, showMergeDialog: true }
    case 'dismissMergeDialog':
      return { ...state, ...CLOSED_MERGE_DIALOG }
    case 'selectMergeDuplicate':
      return {
        ...state,
        mergeDuplicateId: action.id,
        // The duplicate is excluded from the "keep" list, so a kept game type
        // that just became the duplicate has to be dropped rather than left
        // dangling.
        mergeKeptId: state.mergeKeptId === action.id ? undefined : state.mergeKeptId,
        mergeError: undefined,
      }
    case 'selectMergeKept':
      return { ...state, mergeKeptId: action.id, mergeError: undefined }
    case 'mergeSucceeded':
      return {
        ...state,
        gameTypes: action.gameTypes,
        allGameTypes: action.allGameTypes,
        ...CLOSED_MERGE_DIALOG,
        // The merged-away game type may have been the one open in the detail modal.
        selectedGameId: undefined,
      }
    case 'mergeFailed':
      return { ...state, mergeError: action.error }
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadGameTypes(getGameTypes: GetGameTypesUseCase): LoadedGameTypes {
  return { gameTypes: getGameTypes.invoke(), allGameTypes: getGameTypes.invoke(true) }
}

/** Mirrors GameTypeHandler's AddGameType try/catch, using the current form fields. */
export function submitAddGameType(
  addGameTypeUseCase: AddGameTypeUseCase,
  getGameTypes: GetGameTypesUseCase,
  state: GameTypeState,
): LoadedGameTypes | { error: string } {
  try {
    addGameTypeUseCase.invoke(state.inputName.trim(), state.selectedWinCondition, {
      tieBreakRule: state.selectedTieBreakRule,
      tieBreakCondition: state.selectedTieBreakCondition,
      tieBreakLabel: state.selectedTieBreakLabel ?? null,
    })
    return loadGameTypes(getGameTypes)
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
): LoadedGameTypes | { error: string } {
  try {
    updateGameTypeUseCase.invoke(gameType)
    return loadGameTypes(getGameTypes)
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

export function submitArchiveGameType(
  archiveGameTypeUseCase: ArchiveGameTypeUseCase,
  getGameTypes: GetGameTypesUseCase,
  gameTypeId: string,
): LoadedGameTypes | { error: string } {
  try {
    archiveGameTypeUseCase.invoke(gameTypeId)
    return loadGameTypes(getGameTypes)
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

/** Mirrors submitAddGameType's try/catch; an incomplete selection is a no-op. */
export function submitMergeGameTypes(
  mergeGameTypesUseCase: MergeGameTypesUseCase,
  getGameTypes: GetGameTypesUseCase,
  state: GameTypeState,
): LoadedGameTypes | { error: string } | undefined {
  const { mergeDuplicateId, mergeKeptId } = state
  if (mergeDuplicateId === undefined || mergeKeptId === undefined) return undefined
  try {
    mergeGameTypesUseCase.invoke(mergeDuplicateId, mergeKeptId)
    return loadGameTypes(getGameTypes)
  } catch (e) {
    return { error: errorMessage(e) }
  }
}
