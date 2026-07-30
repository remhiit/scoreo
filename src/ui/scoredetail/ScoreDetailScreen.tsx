import { useEffect, useReducer, useRef } from 'react'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { ManualSelectionDialog } from './ManualSelectionDialog'
import { RoundEntrySheet } from './RoundEntrySheet'
import { RoundHistoryList } from './RoundHistoryList'
import {
  computeStandings,
  computeTotals,
  countRoundsPlayed,
  leadHintLabel,
  nextRoundNumber,
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

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`
}

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
  const standings = computeStandings(state.gameType, state.players, state.rounds)
  const leadHint = leadHintLabel(state.gameType, countRoundsPlayed(state.rounds))

  return (
    <>
      <div className="seg">
        <button
          type="button"
          className={state.viewMode === 'standings' ? 'on' : ''}
          onClick={() => dispatch({ type: 'setViewMode', mode: 'standings' })}
        >
          Standings
        </button>
        <button
          type="button"
          className={state.viewMode === 'history' ? 'on' : ''}
          onClick={() => dispatch({ type: 'setViewMode', mode: 'history' })}
        >
          History
        </button>
      </div>

      {state.viewMode === 'standings' ? (
        <>
          <div className="lead-hint">{leadHint}</div>
          <div className="gs-grid">
            {standings.map((row) => (
              <div key={row.playerId} className={row.isLead ? 'gs-card gs-card--lead' : 'gs-card'}>
                <div className="gs-top">
                  <span className="gs-pos">{row.rank}</span>
                  <span className="gs-name">{row.playerName}</span>
                </div>
                <div className="gs-bot">
                  <span className="gs-tot">{row.total}</span>
                  <span className="gs-delta">{formatDelta(row.delta)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <RoundHistoryList
          rounds={state.rounds}
          players={state.players}
          onChangeScore={(roundIndex, playerId, value) => dispatch({ type: 'updateScore', roundIndex, playerId, value })}
          onRemoveRound={(index) => dispatch({ type: 'removeRound', index })}
          onAddRound={() => dispatch({ type: 'openRoundSheet' })}
        />
      )}

      {state.error && <div className="error-msg">{state.error}</div>}

      <div className="bottom-bar">
        <LudoButton
          text={`Enter round ${nextRoundNumber(state.rounds)}`}
          variant="primary"
          onClick={() => dispatch({ type: 'openRoundSheet' })}
        />
        <div className="bottom-bar-row">
          <LudoButton text="Finish match" variant="primary" onClick={() => dispatch(submitTerminate(state, deps))} />
          <LudoButton
            text="Cancel"
            variant="secondary"
            onClick={() => dispatch(submitCancelMatch(state, deps))}
          />
        </div>
      </div>

      <RoundEntrySheet
        open={state.showRoundSheet}
        roundNumber={nextRoundNumber(state.rounds)}
        players={state.players}
        totals={totals}
        inputs={state.roundSheetInputs}
        onChange={(playerId, value) => dispatch({ type: 'updateRoundSheetInput', playerId, value })}
        onCancel={() => dispatch({ type: 'closeRoundSheet' })}
        onSubmit={() => dispatch({ type: 'submitRoundSheet' })}
      />

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
        <ListContainer>
          {state.players.map((player) => (
            <ListItemRow
              key={player.id}
              label={player.name}
              subtitle={`${totals.get(player.id) ?? 0} pts`}
              isSelectable
              isSelected={state.modalWinners.has(player.id)}
              onSelect={() => dispatch({ type: 'toggleModalWinner', playerId: player.id })}
            />
          ))}
        </ListContainer>
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
