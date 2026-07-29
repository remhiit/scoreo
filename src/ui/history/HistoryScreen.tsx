import { Fragment, useCallback, useEffect, useReducer } from 'react'
import type { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { GameType } from '../../domain/model/gameType'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { buildScoreSummary, deleteMatch, historyReducer, loadDisplays } from './historyReducer'
import { initialHistoryState } from './historyTypes'

export interface HistoryScreenProps {
  getMatches: GetMatchesUseCase
  getPlayers: GetPlayersUseCase
  getGameTypes: GetGameTypesUseCase
  deleteMatchUseCase: DeleteMatchUseCase
  /** undefined = edit action hidden (no navigation wired up). */
  onEditMatch?: (gameTypeId: string, playerIds: string[], matchId: string) => void
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
    if (state.selectedGameTypeFilter === undefined) return 'No matches yet.'
    const gameName = state.displays.find((d) => d.match.gameTypeId === state.selectedGameTypeFilter)?.gameType?.name
    return gameName ? `No matches for ${gameName}` : 'No matches yet.'
  })()

  const matchToDelete = state.displays.find((d) => d.match.id === state.deleteConfirmMatchId)

  return (
    <>
      {state.error && <div className="error-msg">{state.error}</div>}

      <div className="history-filter">
        <label>Filter by game:</label>
        <select
          className="filter-select"
          value={state.selectedGameTypeFilter ?? ''}
          onChange={(e) => dispatch({ type: 'selectGameTypeFilter', gameTypeId: e.target.value || undefined })}
        >
          <option value="">All games</option>
          {uniqueGameTypes(state.displays).map((gt) => (
            <option key={gt.id} value={gt.id}>
              {gt.name}
            </option>
          ))}
        </select>
      </div>

      {filteredDisplays.length === 0 ? (
        <div className="empty">{emptyText}</div>
      ) : (
        <ListContainer>
          {filteredDisplays.map((display) => {
            const gameLabel = display.gameType?.name ?? 'Unknown game'
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
                onEdit={
                  onEditMatch && gameType
                    ? () =>
                        onEditMatch(
                          gameType.id,
                          display.match.playerScores.map((ps) => ps.playerId),
                          display.match.id,
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
        open={state.deleteConfirmMatchId !== undefined && matchToDelete !== undefined}
        title="Delete match?"
        onClose={() => dispatch({ type: 'dismissDeleteConfirm' })}
        footer={
          <>
            <LudoButton
              text="Cancel"
              variant="secondary"
              onClick={() => dispatch({ type: 'dismissDeleteConfirm' })}
            />
            <LudoButton
              text="Delete"
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
              {matchToDelete.gameType?.name ?? 'Unknown'} · {matchToDelete.dateFormatted}
            </p>
            <ul>
              {matchToDelete.match.playerScores.map((ps) => (
                <li key={ps.playerId}>
                  {matchToDelete.playerLabels[ps.playerId] ?? '?'}: {ps.score}
                </li>
              ))}
            </ul>
            <p>Match data will be lost.</p>
          </>
        )}
      </LudoModal>
    </>
  )
}
