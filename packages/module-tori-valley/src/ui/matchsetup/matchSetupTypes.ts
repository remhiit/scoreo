import {
  defaultObjectifCardSelection,
  type ObjectifCardSelection,
} from '../../domain/model/landscape'

export interface MatchSetupState {
  playerIds: string[]
  selection: ObjectifCardSelection
}

export function buildInitialMatchSetupState(
  playerIds: string[],
  selection: ObjectifCardSelection = defaultObjectifCardSelection(),
): MatchSetupState {
  return { playerIds, selection }
}
