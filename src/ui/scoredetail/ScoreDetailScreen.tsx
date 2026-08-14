import { useEffect, useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
  toDateOnly,
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
  const { t } = useTranslation()
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
      <div className="match-date-row">
        <label htmlFor="match-date-input" className="match-date-label">
          {t('scoreDetail.matchDate')}
        </label>
        <input
          id="match-date-input"
          type="date"
          className="ludo-input ludo-input--sm ludo-input--bare match-date-input"
          value={state.matchDate}
          max={toDateOnly(deps.currentDate())}
          onChange={(e) => dispatch({ type: 'updateMatchDate', value: e.target.value })}
        />
      </div>

      <div className="seg">
        <button
          type="button"
          className={state.viewMode === 'standings' ? 'on' : ''}
          onClick={() => dispatch({ type: 'setViewMode', mode: 'standings' })}
        >
          {t('scoreDetail.standings')}
        </button>
        <button
          type="button"
          className={state.viewMode === 'history' ? 'on' : ''}
          onClick={() => dispatch({ type: 'setViewMode', mode: 'history' })}
        >
          {t('scoreDetail.history')}
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
          text={t('scoreDetail.enterRound', { number: nextRoundNumber(state.rounds) })}
          variant="primary"
          onClick={() => dispatch({ type: 'openRoundSheet' })}
        />
        <div className="bottom-bar-row">
          <LudoButton
            text={t('scoreDetail.finishMatch')}
            variant="primary"
            onClick={() => dispatch(submitTerminate(state, deps))}
          />
          <LudoButton
            text={t('common.cancel')}
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
        title={t('scoreDetail.selectWinners')}
        onClose={() => dispatch({ type: 'dismissModal' })}
        footer={
          <>
            <LudoButton
              text={t('common.cancel')}
              variant="secondary"
              onClick={() => dispatch({ type: 'dismissModal' })}
            />
            <LudoButton
              text={t('common.confirm')}
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
              subtitle={t('scoreDetail.pointsSuffix', { points: totals.get(player.id) ?? 0 })}
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
        title={t('scoreDetail.discardScoresTitle')}
        onClose={() => dispatch({ type: 'dismissCancelConfirm' })}
        footer={
          <>
            <LudoButton
              text={t('common.cancel')}
              variant="secondary"
              onClick={() => dispatch({ type: 'dismissCancelConfirm' })}
            />
            <LudoButton text={t('scoreDetail.discard')} variant="danger" onClick={() => dispatch(submitConfirmCancel(deps))} />
          </>
        }
      >
        <p>{t('scoreDetail.discardScoresBody')}</p>
      </LudoModal>
    </>
  )
}
