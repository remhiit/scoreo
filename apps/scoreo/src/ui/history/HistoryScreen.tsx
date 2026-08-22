import { Fragment, useCallback, useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { GameType } from '../../domain/model/gameType'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { buildRoundBreakdown, buildScoreSummary, deleteMatch, historyReducer, loadDisplays } from './historyReducer'
import { initialHistoryState } from './historyTypes'

export interface HistoryScreenProps {
  getMatches: GetMatchesUseCase
  getPlayers: GetPlayersUseCase
  getGameTypes: GetGameTypesUseCase
  deleteMatchUseCase: DeleteMatchUseCase
  /** undefined = edit action hidden (no navigation wired up). moduleId is set only for a match scored on a module. */
  onEditMatch?: (gameTypeId: string, playerIds: string[], matchId: string, moduleId?: string) => void
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
    const gameName = state.displays.find((d) => d.match.gameTypeId === state.selectedGameTypeFilter)?.gameType?.name
    return gameName ? t('history.noMatchesForGame', { gameName }) : t('history.noMatchesYet')
  })()

  const matchToDelete = state.displays.find((d) => d.match.id === state.deleteConfirmMatchId)
  const matchToView = state.displays.find((d) => d.match.id === state.roundsMatchId)
  const roundBreakdown = matchToView ? buildRoundBreakdown(matchToView) : []

  return (
    <>
      {state.error && <div className="error-msg">{state.error}</div>}

      <div className="history-filter">
        <label>{t('history.filterByGame')}</label>
        <div className="select-chevron select-chevron--compact">
          <select
            className="filter-select"
            value={state.selectedGameTypeFilter ?? ''}
            onChange={(e) => dispatch({ type: 'selectGameTypeFilter', gameTypeId: e.target.value || undefined })}
          >
            <option value="">{t('history.allGames')}</option>
            {uniqueGameTypes(state.displays).map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredDisplays.length === 0 ? (
        <div className="empty">{emptyText}</div>
      ) : (
        <ListContainer>
          {filteredDisplays.map((display) => {
            const gameLabel = display.gameType?.name ?? t('history.unknownGame')
            const gameType = display.gameType
            return (
              <ListItemRow
                key={display.match.id}
                label={gameLabel}
                players={
                  <>
                    {buildScoreSummary(display).map((part, i) => (
                      <Fragment key={part.playerId}>
                        {i > 0 && ' · '}
                        {part.isWinner ? <strong>{part.text}</strong> : part.text}
                      </Fragment>
                    ))}
                  </>
                }
                date={display.dateFormatted}
                onView={() => dispatch({ type: 'showRounds', matchId: display.match.id })}
                onEdit={
                  onEditMatch && gameType
                    ? () =>
                        onEditMatch(
                          gameType.id,
                          display.match.playerScores.map((ps) => ps.playerId),
                          display.match.id,
                          display.match.moduleData?.moduleId,
                        )
                    : undefined
                }
                onDelete={() => dispatch({ type: 'showDeleteConfirm', matchId: display.match.id })}
              />
            )
          })}
        </ListContainer>
      )}

      <LudoModal
        open={matchToView !== undefined}
        title={t('history.roundsTitle')}
        onClose={() => dispatch({ type: 'dismissRounds' })}
        footer={
          <LudoButton
            text={t('common.close')}
            variant="secondary"
            onClick={() => dispatch({ type: 'dismissRounds' })}
          />
        }
      >
        {matchToView && (
          <>
            <p className="rounds-detail-head">
              {matchToView.gameType?.name ?? t('history.unknownGame')} · {matchToView.dateFormatted}
            </p>
            {roundBreakdown.length === 0 ? (
              <p className="rounds-detail-empty">{t('history.noRoundDetail')}</p>
            ) : (
              roundBreakdown.map((round) => (
                <div key={round.roundNumber} className="rounds-detail-round">
                  <span className="rounds-detail-round-head">
                    {t('scoreDetail.round', { number: round.roundNumber })}
                  </span>
                  <div className="rounds-detail-cells">
                    {round.cells.map((cell) => (
                      <span key={cell.playerId} className="rounds-detail-cell">
                        <span>{cell.label}</span>
                        <span className="rounds-detail-score">{cell.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
            <p className="rounds-detail-totals">
              {t('history.totals')}{' '}
              {buildScoreSummary(matchToView).map((part, i) => (
                <Fragment key={part.playerId}>
                  {i > 0 && ' · '}
                  {part.isWinner ? <strong>{part.text}</strong> : part.text}
                </Fragment>
              ))}
            </p>
          </>
        )}
      </LudoModal>

      <LudoModal
        open={state.deleteConfirmMatchId !== undefined && matchToDelete !== undefined}
        title={t('history.deleteTitle')}
        onClose={() => dispatch({ type: 'dismissDeleteConfirm' })}
        footer={
          <>
            <LudoButton
              text={t('common.cancel')}
              variant="secondary"
              onClick={() => dispatch({ type: 'dismissDeleteConfirm' })}
            />
            <LudoButton
              text={t('common.delete')}
              variant="danger"
              onClick={() => {
                if (state.deleteConfirmMatchId !== undefined) handleDelete(state.deleteConfirmMatchId)
              }}
            />
          </>
        }
      >
        {matchToDelete && (
          <>
            <p>
              {matchToDelete.gameType?.name ?? t('history.unknown')} · {matchToDelete.dateFormatted}
            </p>
            <ul>
              {matchToDelete.match.playerScores.map((ps) => (
                <li key={ps.playerId}>
                  {matchToDelete.playerLabels[ps.playerId] ?? '?'}: {ps.score}
                </li>
              ))}
            </ul>
            <p>{t('history.matchDataWillBeLost')}</p>
          </>
        )}
      </LudoModal>
    </>
  )
}
