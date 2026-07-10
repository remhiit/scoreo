import type { GameTypeAction } from './gameTypeReducer'
import type { GameTypeState } from './gameTypeTypes'
import { TieBreakRuleSchema, WinConditionSchema, tieBreakRuleLabel, winConditionLabel } from '../../domain/model/enums'
import { LudoButton } from '../shared/LudoButton'
import { LudoTextInput } from '../shared/LudoTextInput'

export interface GameTypeFieldsProps {
  state: GameTypeState
  dispatch: (action: GameTypeAction) => void
}

/** Win condition / tie-break fields, shared by the add form and the edit modal. */
export function GameTypeFields({ state, dispatch }: GameTypeFieldsProps) {
  return (
    <>
      <div className="section-label">Win condition</div>
      <select
        className="select"
        value={state.selectedWinCondition}
        onChange={(e) =>
          dispatch({ type: 'selectWinCondition', winCondition: e.target.value as GameTypeState['selectedWinCondition'] })
        }
      >
        {WinConditionSchema.options.map((wc) => (
          <option key={wc} value={wc}>
            {winConditionLabel(wc)}
          </option>
        ))}
      </select>

      <div className="section-label">Tie-break rule</div>
      <select
        className="select"
        value={state.selectedTieBreakRule}
        onChange={(e) => dispatch({ type: 'updateTieBreakRule', rule: e.target.value as GameTypeState['selectedTieBreakRule'] })}
      >
        {TieBreakRuleSchema.options.map((rule) => (
          <option key={rule} value={rule}>
            {tieBreakRuleLabel(rule)}
          </option>
        ))}
      </select>

      {state.selectedTieBreakRule === 'SECONDARY_SCORE' && (
        <>
          <div className="section-label">Tie break condition:</div>
          <select
            className="select"
            value={state.selectedTieBreakCondition}
            onChange={(e) =>
              dispatch({
                type: 'updateTieBreakCondition',
                condition: e.target.value as GameTypeState['selectedTieBreakCondition'],
              })
            }
          >
            {WinConditionSchema.options.map((cond) => (
              <option key={cond} value={cond}>
                {winConditionLabel(cond)}
              </option>
            ))}
          </select>

          <div className="section-label">Tie break question:</div>
          <div className="form-row">
            <LudoTextInput
              value={state.selectedTieBreakLabel ?? ''}
              onChange={(label) => dispatch({ type: 'updateTieBreakLabel', label })}
              placeholder="e.g. Number of cards"
            />
          </div>
        </>
      )}
    </>
  )
}

export interface GameTypeFormProps extends GameTypeFieldsProps {
  onSubmit: () => void
}

/** Add-game-type form. Hidden while editing (the edit modal reuses GameTypeFields instead). */
export function GameTypeForm({ state, dispatch, onSubmit }: GameTypeFormProps) {
  if (state.editingGameId !== undefined) return null

  return (
    <>
      <div className="form-row">
        <LudoTextInput
          value={state.inputName}
          onChange={(name) => dispatch({ type: 'updateName', name })}
          placeholder="Game name"
          onEnter={onSubmit}
        />
      </div>

      <GameTypeFields state={state} dispatch={dispatch} />

      <div style={{ display: 'flex', gap: '8px' }}>
        <LudoButton text="Add game type" variant="primary" className="ludo-btn--full" onClick={onSubmit} />
      </div>
    </>
  )
}
