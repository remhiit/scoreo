import type { TieBreakRule, WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'

export interface GameTypeState {
  gameTypes: GameType[]
  /**
   * Every game type, archived ones included — the merge dialog's candidate
   * list. A duplicate is often archived to hide it before the user thinks of
   * merging, so restricting the merge to `gameTypes` would leave it unfixable.
   */
  allGameTypes: GameType[]
  inputName: string
  selectedWinCondition: WinCondition
  selectedTieBreakRule: TieBreakRule
  selectedTieBreakCondition: WinCondition
  selectedTieBreakLabel: string | undefined
  selectedGameId: string | undefined
  editingGameId: string | undefined
  error: string | undefined
  archiveConfirmGameTypeId: string | undefined
  showMergeDialog: boolean
  /** Game type to absorb, hard-deleted once the merge succeeds. */
  mergeDuplicateId: string | undefined
  /** Game type to keep, inheriting the duplicate's matches. */
  mergeKeptId: string | undefined
  /** Kept apart from `error`, which is rendered on the screen behind the dialog. */
  mergeError: string | undefined
}

export const initialGameTypeState: GameTypeState = {
  gameTypes: [],
  allGameTypes: [],
  inputName: '',
  selectedWinCondition: 'HIGHEST_SCORE',
  selectedTieBreakRule: 'NONE',
  selectedTieBreakCondition: 'HIGHEST_SCORE',
  selectedTieBreakLabel: undefined,
  selectedGameId: undefined,
  editingGameId: undefined,
  error: undefined,
  archiveConfirmGameTypeId: undefined,
  showMergeDialog: false,
  mergeDuplicateId: undefined,
  mergeKeptId: undefined,
  mergeError: undefined,
}
