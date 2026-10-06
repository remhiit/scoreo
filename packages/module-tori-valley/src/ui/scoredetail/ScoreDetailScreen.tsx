import {
  Button,
  ButtonRow,
  NumberField,
  Panel,
  Select,
  Stack,
  Text,
} from '@scoreboards/design-system'
import { useEffect, useReducer } from 'react'
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
import { ToriiBadge } from '../../design'
import { ObjectifLandscapeEntry } from './ObjectifLandscapeEntry'
import { scoreDetailReducer } from './scoreDetailReducer'
import type { ScoreDetailState } from './scoreDetailTypes'

export interface ScoreDetailScreenProps {
  initialState: ScoreDetailState
  /**
   * Persists the entered scores. Where they go is the caller's business — the
   * module hands them to Scoreo through `ModuleHost`. Throwing here surfaces as
   * the screen's error message.
   */
  save: (results: PlayerResult[], objectifCards: ObjectifCardSelection) => void
  /**
   * Internal to the module, not part of `ScoringModuleScreenProps`: the state
   * lives in this screen's own `useReducer`, so it has to bubble up for
   * `ToriValleyModuleScreen` to write it as a draft via `host.saveDraft`.
   * Called after every grid change, including the first render.
   */
  onChange?: (results: PlayerResult[], objectifCards: ObjectifCardSelection) => void
  onSaved: () => void
  onCancel: () => void
}

export function ScoreDetailScreen({
  initialState,
  save,
  onChange,
  onSaved,
  onCancel,
}: ScoreDetailScreenProps) {
  const { t } = useTranslation(TORI_VALLEY_NS)
  const [state, dispatch] = useReducer(scoreDetailReducer, initialState)

  useEffect(() => {
    onChange?.(state.results, state.objectifCards)
  }, [onChange, state.results, state.objectifCards])

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
    <Stack gap={4}>
      {state.error && (
        <Text block variant="error">
          {state.error}
        </Text>
      )}

      <Panel title={t('scoreDetail.pinceauHolderLabel')}>
        <Select
          ariaLabel={t('scoreDetail.pinceauHolderLabel')}
          value={pinceauHolderId ?? ''}
          placeholder={t('scoreDetail.noneOption')}
          options={state.players.map((player) => ({ value: player.id, label: player.name }))}
          onChange={(value) => dispatch({ type: 'setPinceauHolder', playerId: value || undefined })}
        />
      </Panel>

      {state.players.map((player) => {
        const result = state.results.find((r) => r.playerId === player.id)
        if (!result) return null
        const total = scorePlayerResult(result)

        return (
          <Panel key={player.id} title={t('scoreDetail.playerTotal', { name: player.name, total })}>
            <Stack gap={3}>
              <Text variant="label">{t('scoreDetail.toriiHeading')}</Text>
              {TORII_COLORS.map((color) => (
                <Stack direction="row" align="center" justify="between" key={color}>
                  <ToriiBadge color={color}>{t(`torii.${color}`)}</ToriiBadge>
                  <NumberField
                    mode="plain"
                    value={String(result.toriiCounts[color])}
                    min={0}
                    max={MAX_TORII_PER_COLOR}
                    ariaLabel={t('scoreDetail.toriiCountAria', { name: player.name, color })}
                    onChange={(value) =>
                      dispatch({
                        type: 'updateToriiCount',
                        playerId: player.id,
                        color,
                        count: Number(value),
                      })
                    }
                  />
                </Stack>
              ))}

              <Text variant="label">{t('scoreDetail.objectifHeading')}</Text>
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

              <Select
                label={t('scoreDetail.parcheminLabel')}
                value={String(result.parcheminValue)}
                options={PARCHEMIN_VALUES.map((value) => ({
                  value: String(value),
                  label:
                    value === 0
                      ? t('scoreDetail.noneOption')
                      : t('scoreDetail.parcheminVp', { value }),
                }))}
                onChange={(value) =>
                  dispatch({
                    type: 'updateParchemin',
                    playerId: player.id,
                    value: Number(value) as ParcheminValue,
                  })
                }
              />
            </Stack>
          </Panel>
        )
      })}

      <ButtonRow>
        <Button variant="secondary" onClick={onCancel}>
          {t('scoreDetail.cancel')}
        </Button>
        <Button onClick={handleSave}>{t('scoreDetail.save')}</Button>
      </ButtonRow>
    </Stack>
  )
}
