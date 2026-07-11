import { useEffect, useReducer, useRef } from 'react'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { ManualSelectionDialog } from './ManualSelectionDialog'
import {
  computeTotals,
  saveDraft,
  scoreDetailReducer,
  submitCancelMatch,
  submitConfirmCancel,
  submitConfirmManualWinners,
  submitConfirmWinners,
  submitKeepTie,
  submitSecondaryScores,
  submitTerminate,
  type ScoreDetailDeps,
} from './scoreDetailReducer'
import { SecondaryScoreDialog } from './SecondaryScoreDialog'
import type { ScoreDetailState } from './scoreDetailTypes'

export interface ScoreDetailScreenProps extends ScoreDetailDeps {
  initialState: ScoreDetailState
  onSaved: () => void
  onCancel: () => void
}

export function ScoreDetailScreen({ initialState, onSaved, onCancel, ...deps }: ScoreDetailScreenProps) {
  const [state, dispatch] = useReducer(scoreDetailReducer, initialState)
  const isFirstRoundsEffect = useRef(true)

  useEffect(() => {
    if (isFirstRoundsEffect.current) {
      isFirstRoundsEffect.current = false
      return
    }
    saveDraft(deps, state.gameType, state.players, state.rounds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rounds])

  useEffect(() => {
    if (state.saved) onSaved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.saved])

  useEffect(() => {
    if (state.cancelled) onCancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cancelled])

  const totals = computeTotals(state.players, state.rounds)
  const tiedPlayers = state.players.filter((p) => state.tiedPlayerIds.includes(p.id))

  return (
    <>
      <table className="score-table">
        <tbody>
          <tr>
            {state.players.map((player) => (
              <th key={player.id} className="score-table-cell score-table-header">
                {player.name}
              </th>
            ))}
            {state.rounds.length > 1 && <th className="score-table-cell score-table-action" />}
          </tr>
          <tr>
            {state.players.map((player) => (
              <td key={player.id} className="score-table-cell score-table-total">
                {totals.get(player.id) ?? 0}
              </td>
            ))}
            {state.rounds.length > 1 && <td className="score-table-cell score-table-action" />}
          </tr>
          {state.rounds.map((round, roundIndex) => (
            <tr key={roundIndex} className="score-table-round">
              {state.players.map((player) => (
                <td key={player.id} className="score-table-cell">
                  <input
                    type="number"
                    className="ludo-input ludo-input--sm ludo-input--stepper-field ludo-input--mono"
                    inputMode="numeric"
                    value={round[player.id] ?? ''}
                    onChange={(e) =>
                      dispatch({ type: 'updateScore', roundIndex, playerId: player.id, value: e.target.value })
                    }
                  />
                </td>
              ))}
              {state.rounds.length > 1 && (
                <td className="score-table-cell score-table-action">
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={() => dispatch({ type: 'removeRound', index: roundIndex })}
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="score-table-add">
        <button type="button" className="score-table-add-btn" onClick={() => dispatch({ type: 'addRound' })}>
          ＋
        </button>
      </div>

      {state.error && <div className="error-msg">{state.error}</div>}

      <div className="score-actions">
        <LudoButton text="Finish match" variant="primary" onClick={() => dispatch(submitTerminate(state, deps))} />
        <LudoButton
          text="Cancel"
          variant="secondary"
          onClick={() => dispatch(submitCancelMatch(state, deps))}
        />
      </div>

      <LudoModal
        open={state.showWinnerModal}
        title="Select winner(s)"
        onClose={() => dispatch({ type: 'dismissModal' })}
        footer={
          <>
            <LudoButton text="Cancel" variant="secondary" onClick={() => dispatch({ type: 'dismissModal' })} />
            <LudoButton
              text="Confirm"
              variant="primary"
              onClick={() => dispatch(submitConfirmWinners(state, deps))}
            />
          </>
        }
      >
        {state.players.map((player) => (
          <div key={player.id} className="modal-row">
            <input
              type="checkbox"
              checked={state.modalWinners.has(player.id)}
              onChange={() => dispatch({ type: 'toggleModalWinner', playerId: player.id })}
            />
            <span>
              {player.name} — {totals.get(player.id) ?? 0} pts
            </span>
          </div>
        ))}
        {state.error && <div className="error-msg">{state.error}</div>}
      </LudoModal>

      {state.showSecondaryScoreDialog && (
        <SecondaryScoreDialog
          gameType={state.gameType}
          tiedPlayers={tiedPlayers}
          secondaryScoreInputs={state.secondaryScoreInputs}
          error={state.error}
          onUpdateInput={(playerId, value) => dispatch({ type: 'updateSecondaryScoreInput', playerId, value })}
          onSubmit={() => dispatch(submitSecondaryScores(state, deps))}
          onDismiss={() => dispatch({ type: 'dismissTieBreak' })}
        />
      )}

      {state.showManualSelectionDialog && (
        <ManualSelectionDialog
          tiedPlayers={tiedPlayers}
          selectedWinners={state.manualSelectionWinners}
          error={state.error}
          onToggleWinner={(playerId) => dispatch({ type: 'toggleManualSelectionWinner', playerId })}
          onConfirm={() => dispatch(submitConfirmManualWinners(state, deps))}
          onKeepTie={() => dispatch(submitKeepTie(state, deps))}
          onDismiss={() => dispatch({ type: 'dismissTieBreak' })}
        />
      )}

      <LudoModal
        open={state.showCancelConfirm}
        title="Discard scores?"
        onClose={() => dispatch({ type: 'dismissCancelConfirm' })}
        footer={
          <>
            <LudoButton
              text="Cancel"
              variant="secondary"
              onClick={() => dispatch({ type: 'dismissCancelConfirm' })}
            />
            <LudoButton
              text="Discard"
              variant="danger"
              onClick={() => dispatch(submitConfirmCancel(deps))}
            />
          </>
        }
      >
        <p>All entered scores will be lost.</p>
      </LudoModal>
    </>
  )
}
