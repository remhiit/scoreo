import { Checkbox, NumberField, Stack, Text } from '@scoreboards/design-system'
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
    <Stack gap={2}>
      <Stack direction="row" align="center" justify="between">
        <Text variant="strong">
          {landscapeLabel} {t('scoreDetail.objectifVariant', { variant })}
        </Text>
        <Text variant="mono">{t('scoreDetail.vp', { value: points })}</Text>
      </Stack>

      {!card.computable && (
        <Text block variant="muted">
          {t(card.notComputableReasonKey ?? '')}
        </Text>
      )}

      {isManual ? (
        <Stack direction="row" align="center" justify="between">
          <Text>{t('scoreDetail.objectifTotalLabel')}</Text>
          <NumberField
            mode="plain"
            value={String(points)}
            ariaLabel={t('scoreDetail.objectifPointsAria', {
              name: playerName,
              landscape: landscapeLabel,
            })}
            onChange={(value) =>
              dispatch({
                type: 'updateObjectifPoints',
                playerId: result.playerId,
                landscape,
                points: Number(value),
              })
            }
          />
        </Stack>
      ) : (
        card.fields.map((field) => {
          const value = result.objectifInputs[landscape][field.key] ?? 0
          const label = t(field.labelKey)
          const aria = `${playerName} — ${label}`

          return field.kind === 'flag' ? (
            <Checkbox
              key={field.key}
              ariaLabel={aria}
              checked={value === 1}
              onChange={(checked) =>
                dispatch({
                  type: 'updateObjectifInput',
                  playerId: result.playerId,
                  landscape,
                  key: field.key,
                  value: checked ? 1 : 0,
                })
              }
            >
              {label}
            </Checkbox>
          ) : (
            <Stack direction="row" align="center" justify="between" key={field.key}>
              <Text>{label}</Text>
              <NumberField
                mode="plain"
                value={String(value)}
                min={field.min}
                max={field.max}
                ariaLabel={aria}
                onChange={(next) =>
                  dispatch({
                    type: 'updateObjectifInput',
                    playerId: result.playerId,
                    landscape,
                    key: field.key,
                    value: Number(next),
                  })
                }
              />
            </Stack>
          )
        })
      )}

      {card.computable && (
        <Checkbox
          ariaLabel={t('scoreDetail.manualToggleAria', {
            name: playerName,
            landscape: landscapeLabel,
          })}
          checked={isManual}
          onChange={(manual) =>
            dispatch({
              type: 'setObjectifManual',
              playerId: result.playerId,
              landscape,
              manual,
            })
          }
        >
          {t('scoreDetail.manualToggle')}
        </Checkbox>
      )}
    </Stack>
  )
}
