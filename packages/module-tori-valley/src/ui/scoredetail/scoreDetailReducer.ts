import {
  defaultObjectifCardSelection,
  type LandscapeType,
  type ObjectifCardSelection,
} from '../../domain/model/landscape'
import { emptyPlayerResult, type ParcheminValue, type PlayerResult } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import type { ToriiColor } from '../../domain/model/torii'
import type { ScoreDetailMode, ScoreDetailState } from './scoreDetailTypes'

export function buildInitialState(
  players: Player[],
  mode: ScoreDetailMode,
  existingResults: PlayerResult[] = [],
  objectifCards: ObjectifCardSelection = defaultObjectifCardSelection(),
): ScoreDetailState {
  const results = players.map(
    (player) =>
      existingResults.find((r) => r.playerId === player.id) ?? emptyPlayerResult(player.id),
  )
  return { players, results, mode, objectifCards, error: undefined, saved: false }
}

export type ScoreDetailAction =
  | { type: 'updateToriiCount'; playerId: string; color: ToriiColor; count: number }
  | { type: 'updateParchemin'; playerId: string; value: ParcheminValue }
  | { type: 'setPinceauHolder'; playerId: string | undefined }
  | { type: 'updateObjectifPoints'; playerId: string; landscape: LandscapeType; points: number }
  | { type: 'saveSucceeded' }
  | { type: 'saveFailed'; error: string }

function updateResult(
  results: PlayerResult[],
  playerId: string,
  update: (result: PlayerResult) => PlayerResult,
): PlayerResult[] {
  return results.map((result) => (result.playerId === playerId ? update(result) : result))
}

export function scoreDetailReducer(
  state: ScoreDetailState,
  action: ScoreDetailAction,
): ScoreDetailState {
  switch (action.type) {
    case 'updateToriiCount':
      return {
        ...state,
        error: undefined,
        results: updateResult(state.results, action.playerId, (result) => ({
          ...result,
          toriiCounts: { ...result.toriiCounts, [action.color]: action.count },
        })),
      }
    case 'updateParchemin':
      return {
        ...state,
        error: undefined,
        results: updateResult(state.results, action.playerId, (result) => ({
          ...result,
          parcheminValue: action.value,
        })),
      }
    case 'setPinceauHolder':
      // Only one physical Pinceau token exists (rulebook p.5): holding it is exclusive.
      return {
        ...state,
        error: undefined,
        results: state.results.map((result) => ({
          ...result,
          hasPinceau: result.playerId === action.playerId,
        })),
      }
    case 'updateObjectifPoints':
      return {
        ...state,
        error: undefined,
        results: updateResult(state.results, action.playerId, (result) => ({
          ...result,
          objectifPoints: { ...result.objectifPoints, [action.landscape]: action.points },
        })),
      }
    case 'saveSucceeded':
      return { ...state, saved: true, error: undefined }
    case 'saveFailed':
      return { ...state, error: action.error }
  }
}
