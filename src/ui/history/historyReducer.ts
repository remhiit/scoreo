import { getWinners, isTieBreakIndeterminate } from '../../domain/model/match'
import type { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { HistoryState, MatchDisplay } from './historyTypes'

export type HistoryAction =
  | { type: 'loaded'; displays: MatchDisplay[] }
  | { type: 'showDeleteConfirm'; matchId: string }
  | { type: 'deleteFailed'; error: string }
  | { type: 'dismissDeleteConfirm' }
  | { type: 'selectGameTypeFilter'; gameTypeId: string | undefined }

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'loaded':
      return { ...state, displays: action.displays, deleteConfirmMatchId: undefined, error: undefined }
    case 'showDeleteConfirm':
      return { ...state, deleteConfirmMatchId: action.matchId }
    case 'deleteFailed':
      return { ...state, error: action.error }
    case 'dismissDeleteConfirm':
      return { ...state, deleteConfirmMatchId: undefined }
    case 'selectGameTypeFilter':
      return { ...state, selectedGameTypeFilter: action.gameTypeId }
  }
}

export interface ScoreSummaryPart {
  playerId: string
  text: string
  isWinner: boolean
}

/** Builds the `.list-item-players` parts for a match: one per player, winner(s) flagged for bold rendering. */
export function buildScoreSummary(display: MatchDisplay): ScoreSummaryPart[] {
  return display.match.playerScores.map((ps) => ({
    playerId: ps.playerId,
    text: `${display.playerLabels[ps.playerId] ?? ps.playerId} ${ps.score}`,
    isWinner: display.winners.includes(ps.playerId),
  }))
}

function playerLabel(name: string, active: boolean): string {
  if (active) return name
  return name.trim() === '' ? 'Deleted player' : `${name} (deleted)`
}

function formatMatchDate(epochMs: number): string {
  const date = new Date(epochMs)
  if (Number.isNaN(date.getTime())) return '??'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Mirrors HistoryHandler.refresh(): rebuilds every match display from the repositories. */
export function loadDisplays(
  getMatches: GetMatchesUseCase,
  getPlayers: GetPlayersUseCase,
  getGameTypes: GetGameTypesUseCase,
): MatchDisplay[] {
  const players = Object.fromEntries(getPlayers.invoke(true).map((p) => [p.id, p]))
  const playerLabels = Object.fromEntries(
    Object.entries(players).map(([id, p]) => [id, playerLabel(p.name, p.active)]),
  )
  const gameTypeMap = new Map(getGameTypes.invoke(true).map((gt) => [gt.id, gt]))

  return [...getMatches.invoke()]
    .sort((a, b) => b.date - a.date)
    .map((match) => {
      const gameType = gameTypeMap.get(match.gameTypeId)
      return {
        match,
        gameType,
        players,
        playerLabels,
        winners: gameType ? getWinners(match, gameType) : [],
        dateFormatted: formatMatchDate(match.date),
        isTieBreakIndeterminate: gameType ? isTieBreakIndeterminate(match, gameType) : false,
      }
    })
}

/** Mirrors HistoryHandler's DeleteMatch try/catch around the use case call. */
export function deleteMatch(deleteMatchUseCase: DeleteMatchUseCase, matchId: string): string | undefined {
  try {
    deleteMatchUseCase.invoke(matchId)
    return undefined
  } catch (e) {
    return `Failed to delete match: ${e instanceof Error ? e.message : String(e)}`
  }
}
