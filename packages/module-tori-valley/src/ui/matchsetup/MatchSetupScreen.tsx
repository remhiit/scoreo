import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { TORI_VALLEY_NS } from '../../i18n'
import {
  LANDSCAPE_TYPES,
  OBJECTIF_VARIANTS,
  type ObjectifCardSelection,
} from '../../domain/model/landscape'
import { AppButton } from '../shared/AppButton'
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
    <div>
      <div className="tv-card">
        <h2>{t('matchSetup.heading')}</h2>
        <p className="tv-empty">{t('matchSetup.intro')}</p>

        <div className="tv-list">
          {LANDSCAPE_TYPES.map((landscape) => (
            <div className="tv-list-item" key={landscape}>
              <span>{t(`landscape.${landscape}`)}</span>
              <span>
                {OBJECTIF_VARIANTS.map((variant) => (
                  <label key={variant}>
                    <input
                      type="radio"
                      name={`variant-${landscape}`}
                      aria-label={t('matchSetup.variantAria', {
                        landscape: t(`landscape.${landscape}`),
                        variant,
                      })}
                      checked={state.selection[landscape] === variant}
                      onChange={() => dispatch({ type: 'selectVariant', landscape, variant })}
                    />{' '}
                    {variant}{' '}
                  </label>
                ))}
              </span>
            </div>
          ))}

          <div className="tv-list-item">
            <span>Torī</span>
            <span className="tv-empty">{t('matchSetup.toriiAlwaysInPlay')}</span>
          </div>
        </div>
      </div>

      <div className="tv-list-item">
        <AppButton text={t('matchSetup.back')} variant="secondary" onClick={onCancel} />
        <AppButton text={t('matchSetup.start')} onClick={() => onConfirm(state.selection)} />
      </div>
    </div>
  )
}
