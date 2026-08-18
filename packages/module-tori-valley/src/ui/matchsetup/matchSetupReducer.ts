import type { LandscapeType, ObjectifVariant } from '../../domain/model/landscape'
import type { MatchSetupState } from './matchSetupTypes'

export type MatchSetupAction = {
  type: 'selectVariant'
  landscape: LandscapeType
  variant: ObjectifVariant
}

export function matchSetupReducer(
  state: MatchSetupState,
  action: MatchSetupAction,
): MatchSetupState {
  switch (action.type) {
    case 'selectVariant':
      // Exactly one card per landscape is dealt, so this replaces rather than adds.
      return {
        ...state,
        selection: { ...state.selection, [action.landscape]: action.variant },
      }
  }
}
