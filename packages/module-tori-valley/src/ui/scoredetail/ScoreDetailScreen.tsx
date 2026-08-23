import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { TORI_VALLEY_NS } from '../../i18n'
import type { ObjectifCardSelection } from '../../domain/model/landscape'
import { LANDSCAPE_TYPES } from '../../domain/model/landscape'
import {
  PARCHEMIN_VALUES,
  scorePlayerResult,
  type ParcheminValue,
  type PlayerResult,
} from '../../domain/model/match'
import { MAX_TORII_PER_COLOR, TORII_COLORS } from '../../domain/model/torii'
import { NotFoundError, ValidationError } from '../../domain/model/errors'
import { AppButton } from '../shared/AppButton'
import { ObjectifLandscapeEntry } from './ObjectifLandscapeEntry'
import { scoreDetailReducer } from './scoreDetailReducer'
import type { ScoreDetailState } from './scoreDetailTypes'

export interface ScoreDetailScreenProps {
  initialState: ScoreDetailState
  /**
   * Persists the entered scores. Where they go is the caller's business: the
   * standalone app writes them to its own repository, the hosted module hands
   * them to Scoreo through `ModuleHost`. Throwing here surfaces as the screen's
   * error message, exactly as a rejected use case used to.
   */
  save: (results: PlayerResult[], objectifCards: ObjectifCardSelection) => void
  onSaved: () => void
  onCancel: () => void
}

export function ScoreDetailScreen({
  initialState,
  save,
  onSaved,
  onCancel,
}: ScoreDetailScreenProps) {
  const { t } = useTranslation(TORI_VALLEY_NS)
  const [state, dispatch] = useReducer(scoreDetailReducer, initialState)

  function errorMessage(e: unknown): string {
    if (e instanceof ValidationError && e.code) return t(e.code, e.params)
    if (e instanceof NotFoundError && e.code) return t(e.code, { id: e.id })
    return e instanceof Error ? e.message : String(e)
  }

  const pinceauHolderId = state.results.find((r) => r.hasPinceau)?.playerId

  function handleSave() {
    try {
      save(state.results, state.objectifCards)
      dispatch({ type: 'saveSucceeded' })
      onSaved()
    } catch (e) {
      dispatch({ type: 'saveFailed', error: errorMessage(e) })
    }
  }

  return (
    <div>
      {state.error && (
        <div className="tv-card" role="alert">
          {state.error}
        </div>
      )}

      <div className="tv-card">
        <label htmlFor="pinceau-holder">{t('scoreDetail.pinceauHolderLabel')}</label>
        <select
          id="pinceau-holder"
          value={pinceauHolderId ?? ''}
          onChange={(e) =>
            dispatch({ type: 'setPinceauHolder', playerId: e.target.value || undefined })
          }
        >
          <option value="">{t('scoreDetail.noneOption')}</option>
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
          <div className="tv-card" key={player.id}>
            <h2>{t('scoreDetail.playerTotal', { name: player.name, total })}</h2>

            <h3>{t('scoreDetail.toriiHeading')}</h3>
            <table className="tv-score-table">
              <tbody>
                {TORII_COLORS.map((color) => (
                  <tr key={color}>
                    <th>
                      <span className={`tv-torii-badge tv-${color}`}>{t(`torii.${color}`)}</span>
                    </th>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={MAX_TORII_PER_COLOR}
                        value={result.toriiCounts[color]}
                        aria-label={t('scoreDetail.toriiCountAria', { name: player.name, color })}
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

            <h3>{t('scoreDetail.objectifHeading')}</h3>
            {LANDSCAPE_TYPES.map((landscape) => (
              <ObjectifLandscapeEntry
                key={landscape}
                landscape={landscape}
                variant={state.objectifCards[landscape]}
                playerName={player.name}
                result={result}
                dispatch={dispatch}
              />
            ))}

            <label htmlFor={`parchemin-${player.id}`}>{t('scoreDetail.parcheminLabel')}</label>
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
                  {value === 0
                    ? t('scoreDetail.noneOption')
                    : t('scoreDetail.parcheminVp', { value })}
                </option>
              ))}
            </select>
          </div>
        )
      })}

      <div className="tv-list-item">
        <AppButton text={t('scoreDetail.cancel')} variant="secondary" onClick={onCancel} />
        <AppButton text={t('scoreDetail.save')} onClick={handleSave} />
      </div>
    </div>
  )
}
