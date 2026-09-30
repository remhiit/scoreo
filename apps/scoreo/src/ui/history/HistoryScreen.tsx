import {
  BulletList,
  Button,
  ButtonRow,
  Dialog,
  EmptyState,
  FilterBar,
  HistoryCell,
  List,
  ListRow,
  RoundCard,
  Score,
  Select,
  Stack,
  Text,
  type RowAction,
} from '@scoreboards/design-system'
import { Fragment, useCallback, useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { GameType } from '../../domain/model/gameType'
import {
  buildRoundBreakdown,
  buildScoreSummary,
  deleteMatch,
  historyReducer,
  loadDisplays,
} from './historyReducer'
import { initialHistoryState } from './historyTypes'

export interface HistoryScreenProps {
  getMatches: GetMatchesUseCase
  getPlayers: GetPlayersUseCase
  getGameTypes: GetGameTypesUseCase
  deleteMatchUseCase: DeleteMatchUseCase
  /** undefined = edit action hidden (no navigation wired up). */
  onEditMatch?: (gameTypeId: string, playerIds: string[], matchId: string) => void
  /**
   * The match to call out — e.g. just saved from a module. React state owned
   * by the caller, not part of this screen's own state or the hash: a
   * refresh always shows the plain, unhighlighted history.
   */
  highlightMatchId?: string
}

/** "Alice 10 · Bob 14" with the winner(s) bold — the same line in the list and in the round breakdown. */
function ScoreSummary({
  parts,
}: {
  parts: { playerId: string; text: string; isWinner: boolean }[]
}) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={part.playerId}>
          {i > 0 && ' · '}
          {part.isWinner ? <Text variant="strong">{part.text}</Text> : part.text}
        </Fragment>
      ))}
    </>
  )
}

function uniqueGameTypes(displays: { gameType: GameType | undefined }[]): GameType[] {
  const seen = new Set<string>()
  const result: GameType[] = []
  for (const { gameType } of displays) {
    if (gameType && !seen.has(gameType.id)) {
      seen.add(gameType.id)
      result.push(gameType)
    }
  }
  return result
}

export function HistoryScreen({
  getMatches,
  getPlayers,
  getGameTypes,
  deleteMatchUseCase,
  onEditMatch,
  highlightMatchId,
}: HistoryScreenProps) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(historyReducer, initialHistoryState)

  const refresh = useCallback(() => {
    dispatch({ type: 'loaded', displays: loadDisplays(getMatches, getPlayers, getGameTypes) })
  }, [getMatches, getPlayers, getGameTypes])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleDelete = (matchId: string) => {
    const error = deleteMatch(deleteMatchUseCase, matchId)
    if (error) {
      dispatch({ type: 'deleteFailed', error })
    } else {
      refresh()
    }
  }

  const filteredDisplays =
    state.selectedGameTypeFilter !== undefined
      ? state.displays.filter((d) => d.match.gameTypeId === state.selectedGameTypeFilter)
      : state.displays

  const emptyText = (() => {
    if (state.selectedGameTypeFilter === undefined) return t('history.noMatchesYet')
    const gameName = state.displays.find((d) => d.match.gameTypeId === state.selectedGameTypeFilter)
      ?.gameType?.name
    return gameName ? t('history.noMatchesForGame', { gameName }) : t('history.noMatchesYet')
  })()

  const matchToDelete = state.displays.find((d) => d.match.id === state.deleteConfirmMatchId)
  const matchToView = state.displays.find((d) => d.match.id === state.roundsMatchId)
  const roundBreakdown = matchToView ? buildRoundBreakdown(matchToView) : []

  return (
    <Stack gap={4}>
      {state.error && <Text variant="error">{state.error}</Text>}

      {/* Stays up even when the list is empty, so no data never reads as a broken filter. */}
      <FilterBar label={t('history.filterByGame')}>
        <Select
          size="sm"
          ariaLabel={t('history.filterByGame')}
          value={state.selectedGameTypeFilter ?? ''}
          placeholder={t('history.allGames')}
          options={uniqueGameTypes(state.displays).map((gt) => ({ value: gt.id, label: gt.name }))}
          onChange={(id) => dispatch({ type: 'selectGameTypeFilter', gameTypeId: id || undefined })}
        />
      </FilterBar>

      {filteredDisplays.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <List>
          {filteredDisplays.map((display) => {
            const gameType = display.gameType
            const actions: RowAction[] = [
              {
                icon: 'view',
                label: 'View details',
                onClick: () => dispatch({ type: 'showRounds', matchId: display.match.id }),
              },
            ]
            if (onEditMatch && gameType) {
              actions.push({
                icon: 'edit',
                label: 'Edit',
                onClick: () =>
                  onEditMatch(
                    gameType.id,
                    display.match.playerScores.map((ps) => ps.playerId),
                    display.match.id,
                  ),
              })
            }
            actions.push({
              icon: 'delete',
              label: 'Delete',
              tone: 'danger',
              onClick: () => dispatch({ type: 'showDeleteConfirm', matchId: display.match.id }),
            })
            return (
              <ListRow
                key={display.match.id}
                title={gameType?.name ?? t('history.unknownGame')}
                highlighted={display.match.id === highlightMatchId}
                players={<ScoreSummary parts={buildScoreSummary(display)} />}
                date={display.dateFormatted}
                actions={actions}
              />
            )
          })}
        </List>
      )}

      <Dialog
        open={matchToView !== undefined}
        title={t('history.roundsTitle')}
        onClose={() => dispatch({ type: 'dismissRounds' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow align="end">
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissRounds' })}>
              {t('common.close')}
            </Button>
          </ButtonRow>
        }
      >
        {matchToView && (
          <>
            <Text variant="muted" block>
              {matchToView.gameType?.name ?? t('history.unknownGame')} · {matchToView.dateFormatted}
            </Text>
            {roundBreakdown.length === 0 ? (
              <Text variant="hint" block>
                {t('history.noRoundDetail')}
              </Text>
            ) : (
              roundBreakdown.map((round) => (
                <RoundCard
                  key={round.roundNumber}
                  title={t('scoreDetail.round', { number: round.roundNumber })}
                >
                  {round.cells.map((cell) => (
                    <HistoryCell key={cell.playerId} name={cell.label}>
                      <Score size="sm">{cell.score}</Score>
                    </HistoryCell>
                  ))}
                </RoundCard>
              ))
            )}
            <Text block>
              {t('history.totals')} <ScoreSummary parts={buildScoreSummary(matchToView)} />
            </Text>
          </>
        )}
      </Dialog>

      <Dialog
        open={state.deleteConfirmMatchId !== undefined && matchToDelete !== undefined}
        title={t('history.deleteTitle')}
        onClose={() => dispatch({ type: 'dismissDeleteConfirm' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow>
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissDeleteConfirm' })}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (state.deleteConfirmMatchId !== undefined)
                  handleDelete(state.deleteConfirmMatchId)
              }}
            >
              {t('common.delete')}
            </Button>
          </ButtonRow>
        }
      >
        {matchToDelete && (
          <>
            <Text block>
              {matchToDelete.gameType?.name ?? t('history.unknown')} · {matchToDelete.dateFormatted}
            </Text>
            <BulletList
              items={matchToDelete.match.playerScores.map(
                (ps) => `${matchToDelete.playerLabels[ps.playerId] ?? '?'}: ${ps.score}`,
              )}
            />
            <Text block>{t('history.matchDataWillBeLost')}</Text>
          </>
        )}
      </Dialog>
    </Stack>
  )
}
