import {
  ActionBar,
  Button,
  ButtonRow,
  DateInput,
  Dialog,
  List,
  ListRow,
  SegmentedControl,
  Stack,
  StandingsCard,
  StandingsGrid,
  Text,
} from '@scoreboards/design-system'
import { useEffect, useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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

export function ScoreDetailScreen({
  initialState,
  onSaved,
  onCancel,
  ...deps
}: ScoreDetailScreenProps) {
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
    <Stack gap={3}>
      <DateInput
        label={t('scoreDetail.matchDate')}
        layout="inline"
        value={state.matchDate}
        max={toDateOnly(deps.currentDate())}
        onChange={(value) => dispatch({ type: 'updateMatchDate', value })}
      />

      <SegmentedControl
        ariaLabel={t('scoreDetail.standings')}
        options={[
          { value: 'standings', label: t('scoreDetail.standings') },
          { value: 'history', label: t('scoreDetail.history') },
        ]}
        value={state.viewMode}
        onChange={(mode) => dispatch({ type: 'setViewMode', mode })}
      />

      {state.viewMode === 'standings' ? (
        <Stack gap={2}>
          <Text variant="caption">{leadHint}</Text>
          <StandingsGrid>
            {standings.map((row) => (
              <StandingsCard
                key={row.playerId}
                rank={row.rank}
                name={row.playerName}
                total={row.total}
                delta={formatDelta(row.delta)}
                lead={row.isLead}
              />
            ))}
          </StandingsGrid>
        </Stack>
      ) : (
        <RoundHistoryList
          rounds={state.rounds}
          players={state.players}
          onChangeScore={(roundIndex, playerId, value) =>
            dispatch({ type: 'updateScore', roundIndex, playerId, value })
          }
          onRemoveRound={(index) => dispatch({ type: 'removeRound', index })}
          onAddRound={() => dispatch({ type: 'openRoundSheet' })}
        />
      )}

      {state.error && <Text variant="error">{state.error}</Text>}

      <ActionBar>
        <Button
          size="lg"
          width="full"
          icon="plus"
          onClick={() => dispatch({ type: 'openRoundSheet' })}
        >
          {t('scoreDetail.enterRound', { number: nextRoundNumber(state.rounds) })}
        </Button>
        <ButtonRow>
          <Button variant="secondary" onClick={() => dispatch(submitCancelMatch(state, deps))}>
            {t('common.cancel')}
          </Button>
          <Button variant="secondary" onClick={() => dispatch(submitTerminate(state, deps))}>
            {t('scoreDetail.finishMatch')}
          </Button>
        </ButtonRow>
      </ActionBar>

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

      <Dialog
        open={state.showWinnerModal}
        title={t('scoreDetail.selectWinners')}
        onClose={() => dispatch({ type: 'dismissModal' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow>
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissModal' })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => dispatch(submitConfirmWinners(state, deps))}>
              {t('common.confirm')}
            </Button>
          </ButtonRow>
        }
      >
        <List>
          {state.players.map((player) => (
            <ListRow
              key={player.id}
              title={player.name}
              subtitle={t('scoreDetail.pointsSuffix', { points: totals.get(player.id) ?? 0 })}
              selectable
              selected={state.modalWinners.has(player.id)}
              onSelect={() => dispatch({ type: 'toggleModalWinner', playerId: player.id })}
            />
          ))}
        </List>
        {state.error && <Text variant="error">{state.error}</Text>}
      </Dialog>

      {state.showSecondaryScoreDialog && (
        <SecondaryScoreDialog
          gameType={state.gameType}
          tiedPlayers={tiedPlayers}
          secondaryScoreInputs={state.secondaryScoreInputs}
          error={state.error}
          onUpdateInput={(playerId, value) =>
            dispatch({ type: 'updateSecondaryScoreInput', playerId, value })
          }
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

      <Dialog
        open={state.showCancelConfirm}
        title={t('scoreDetail.discardScoresTitle')}
        onClose={() => dispatch({ type: 'dismissCancelConfirm' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow>
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissCancelConfirm' })}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => dispatch(submitConfirmCancel(deps))}>
              {t('scoreDetail.discard')}
            </Button>
          </ButtonRow>
        }
      >
        <Text block>{t('scoreDetail.discardScoresBody')}</Text>
      </Dialog>
    </Stack>
  )
}
