import { useReducer } from 'react'
import type { CreateMatchUseCase } from '../../application/createMatchUseCase'
import type { UpdateMatchUseCase } from '../../application/updateMatchUseCase'
import { LANDSCAPE_TYPES, landscapeTypeLabel } from '../../domain/model/landscape'
import { PARCHEMIN_VALUES, scorePlayerResult, type ParcheminValue } from '../../domain/model/match'
import { MAX_TORII_PER_COLOR, TORII_COLORS, type ToriiColor } from '../../domain/model/torii'
import { AppButton } from '../shared/AppButton'
import { scoreDetailReducer } from './scoreDetailReducer'
import type { ScoreDetailState } from './scoreDetailTypes'

export interface ScoreDetailScreenProps {
  initialState: ScoreDetailState
  createMatch: CreateMatchUseCase
  updateMatch: UpdateMatchUseCase
  currentDate: () => number
  onSaved: () => void
  onCancel: () => void
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function toriiColorLabel(color: ToriiColor): string {
  return color[0].toUpperCase() + color.slice(1)
}

export function ScoreDetailScreen({
  initialState,
  createMatch,
  updateMatch,
  currentDate,
  onSaved,
  onCancel,
}: ScoreDetailScreenProps) {
  const [state, dispatch] = useReducer(scoreDetailReducer, initialState)

  const pinceauHolderId = state.results.find((r) => r.hasPinceau)?.playerId

  function handleSave() {
    try {
      if (state.mode.type === 'Create') {
        createMatch.invoke(
          state.players.map((p) => p.id),
          state.results,
          currentDate(),
        )
      } else {
        updateMatch.invoke(state.mode.matchId, state.results)
      }
      dispatch({ type: 'saveSucceeded' })
      onSaved()
    } catch (e) {
      dispatch({ type: 'saveFailed', error: errorMessage(e) })
    }
  }

  return (
    <div>
      {state.error && (
        <div className="card" role="alert">
          {state.error}
        </div>
      )}

      <div className="card">
        <label htmlFor="pinceau-holder">Pinceau holder (+2 VP)</label>
        <select
          id="pinceau-holder"
          value={pinceauHolderId ?? ''}
          onChange={(e) =>
            dispatch({ type: 'setPinceauHolder', playerId: e.target.value || undefined })
          }
        >
          <option value="">— None —</option>
          {state.players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </div>

      {state.players.map((player) => {
        const result = state.results.find((r) => r.playerId === player.id)
        if (!result) return null
        const total = scorePlayerResult(result)

        return (
          <div className="card" key={player.id}>
            <h2>
              {player.name} — {total} VP
            </h2>

            <h3>Torī</h3>
            <table className="score-table">
              <tbody>
                {TORII_COLORS.map((color) => (
                  <tr key={color}>
                    <th>
                      <span className={`torii-badge ${color}`}>{toriiColorLabel(color)}</span>
                    </th>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={MAX_TORII_PER_COLOR}
                        value={result.toriiCounts[color]}
                        aria-label={`${player.name} ${color} Torī count`}
                        onChange={(e) =>
                          dispatch({
                            type: 'updateToriiCount',
                            playerId: player.id,
                            color,
                            count: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Objectif cards</h3>
            <table className="score-table">
              <tbody>
                {LANDSCAPE_TYPES.map((landscape) => (
                  <tr key={landscape}>
                    <th>{landscapeTypeLabel(landscape)}</th>
                    <td>
                      <input
                        type="number"
                        value={result.objectifPoints[landscape]}
                        aria-label={`${player.name} ${landscapeTypeLabel(landscape)} Objectif points`}
                        onChange={(e) =>
                          dispatch({
                            type: 'updateObjectifPoints',
                            playerId: player.id,
                            landscape,
                            points: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <label htmlFor={`parchemin-${player.id}`}>Parchemin</label>
            <select
              id={`parchemin-${player.id}`}
              value={result.parcheminValue}
              onChange={(e) =>
                dispatch({
                  type: 'updateParchemin',
                  playerId: player.id,
                  value: Number(e.target.value) as ParcheminValue,
                })
              }
            >
              {PARCHEMIN_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? '— None —' : `${value} VP`}
                </option>
              ))}
            </select>
          </div>
        )
      })}

      <div className="list-item">
        <AppButton text="Cancel" variant="secondary" onClick={onCancel} />
        <AppButton text="Save match" onClick={handleSave} />
      </div>
    </div>
  )
}
