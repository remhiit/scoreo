import { useTranslation } from 'react-i18next'
import { TORI_VALLEY_NS } from '../../i18n'
import type { LandscapeType, ObjectifVariant } from '../../domain/model/landscape'
import { objectifCard } from '../../domain/model/objectifCard'
import type { PlayerResult } from '../../domain/model/match'
import type { ScoreDetailAction } from './scoreDetailReducer'

export interface ObjectifLandscapeEntryProps {
  landscape: LandscapeType
  variant: ObjectifVariant
  playerName: string
  result: PlayerResult
  dispatch: (action: ScoreDetailAction) => void
}

/**
 * One landscape's Objectif entry: either the counts its card needs (points
 * computed live) or a hand-typed total. The fields come from the card's own
 * descriptor, so all 13 computable cards share this one renderer.
 */
export function ObjectifLandscapeEntry({
  landscape,
  variant,
  playerName,
  result,
  dispatch,
}: ObjectifLandscapeEntryProps) {
  const { t } = useTranslation(TORI_VALLEY_NS)
  const card = objectifCard(landscape, variant)
  const landscapeLabel = t(`landscape.${landscape}`)
  const isManual = result.objectifManual[landscape]
  const points = result.objectifPoints[landscape]

  return (
    <div className="objectif-entry">
      <div className="list-item">
        <strong>
          {landscapeLabel} {t('scoreDetail.objectifVariant', { variant })}
        </strong>
        <span>{t('scoreDetail.vp', { value: points })}</span>
      </div>

      {!card.computable && <p className="empty">{t(card.notComputableReasonKey ?? '')}</p>}

      {isManual ? (
        <label>
          {t('scoreDetail.objectifTotalLabel')}{' '}
          <input
            type="number"
            value={points}
            aria-label={t('scoreDetail.objectifPointsAria', {
              name: playerName,
              landscape: landscapeLabel,
            })}
            onChange={(e) =>
              dispatch({
                type: 'updateObjectifPoints',
                playerId: result.playerId,
                landscape,
                points: Number(e.target.value),
              })
            }
          />
        </label>
      ) : (
        card.fields.map((field) => {
          const value = result.objectifInputs[landscape][field.key] ?? 0
          const label = t(field.labelKey)
          const aria = `${playerName} — ${label}`

          return field.kind === 'flag' ? (
            <label key={field.key} className="list-item">
              <span>{label}</span>
              <input
                type="checkbox"
                aria-label={aria}
                checked={value === 1}
                onChange={(e) =>
                  dispatch({
                    type: 'updateObjectifInput',
                    playerId: result.playerId,
                    landscape,
                    key: field.key,
                    value: e.target.checked ? 1 : 0,
                  })
                }
              />
            </label>
          ) : (
            <label key={field.key} className="list-item">
              <span>{label}</span>
              <input
                type="number"
                min={field.min}
                max={field.max}
                aria-label={aria}
                value={value}
                onChange={(e) =>
                  dispatch({
                    type: 'updateObjectifInput',
                    playerId: result.playerId,
                    landscape,
                    key: field.key,
                    value: Number(e.target.value),
                  })
                }
              />
            </label>
          )
        })
      )}

      {card.computable && (
        <label className="list-item">
          <span>{t('scoreDetail.manualToggle')}</span>
          <input
            type="checkbox"
            aria-label={t('scoreDetail.manualToggleAria', {
              name: playerName,
              landscape: landscapeLabel,
            })}
            checked={isManual}
            onChange={(e) =>
              dispatch({
                type: 'setObjectifManual',
                playerId: result.playerId,
                landscape,
                manual: e.target.checked,
              })
            }
          />
        </label>
      )}
    </div>
  )
}
