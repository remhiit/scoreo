import { Button, ButtonRow, Panel, Stack, Text } from '@scoreboards/design-system'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { TORI_VALLEY_NS } from '../../i18n'
import {
  LANDSCAPE_TYPES,
  OBJECTIF_VARIANTS,
  type ObjectifCardSelection,
} from '../../domain/model/landscape'
import { VariantPicker } from '../../design'
import { matchSetupReducer } from './matchSetupReducer'
import { buildInitialMatchSetupState } from './matchSetupTypes'

export interface MatchSetupScreenProps {
  playerIds: string[]
  /** Variants already recorded for a match being edited; defaults to all-A. */
  initialSelection?: ObjectifCardSelection
  onConfirm: (selection: ObjectifCardSelection) => void
  onCancel: () => void
}

export function MatchSetupScreen({
  playerIds,
  initialSelection,
  onConfirm,
  onCancel,
}: MatchSetupScreenProps) {
  const { t } = useTranslation(TORI_VALLEY_NS)
  const [state, dispatch] = useReducer(
    matchSetupReducer,
    buildInitialMatchSetupState(playerIds, initialSelection),
  )

  return (
    <Stack gap={4}>
      <Panel title={t('matchSetup.heading')} description={t('matchSetup.intro')}>
        <Stack gap={2}>
          {LANDSCAPE_TYPES.map((landscape) => (
            <Stack direction="row" align="center" justify="between" gap={2} key={landscape}>
              <Text variant="strong">{t(`landscape.${landscape}`)}</Text>
              <VariantPicker
                name={`variant-${landscape}`}
                variants={OBJECTIF_VARIANTS}
                value={state.selection[landscape]}
                ariaLabel={(variant) =>
                  t('matchSetup.variantAria', {
                    landscape: t(`landscape.${landscape}`),
                    variant,
                  })
                }
                onChange={(variant) => dispatch({ type: 'selectVariant', landscape, variant })}
              />
            </Stack>
          ))}

          <Stack direction="row" align="center" justify="between" gap={2}>
            <Text variant="strong">Torī</Text>
            <Text variant="muted">{t('matchSetup.toriiAlwaysInPlay')}</Text>
          </Stack>
        </Stack>
      </Panel>

      <ButtonRow>
        <Button variant="secondary" onClick={onCancel}>
          {t('matchSetup.back')}
        </Button>
        <Button onClick={() => onConfirm(state.selection)}>{t('matchSetup.start')}</Button>
      </ButtonRow>
    </Stack>
  )
}
