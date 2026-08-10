import { useTranslation } from 'react-i18next'
import type { Player } from '../../domain/model/player'
import { LudoButton } from '../shared/LudoButton'
import { LudoNumberInput } from '../shared/LudoNumberInput'

export interface RoundEntrySheetProps {
  open: boolean
  roundNumber: number
  players: Player[]
  totals: Map<string, number>
  inputs: Record<string, number>
  onChange: (playerId: string, value: number) => void
  onCancel: () => void
  onSubmit: () => void
}

/**
 * Bottom sheet for entering one round: a stepper per player, next to their
 * running total, replacing direct cell-editing in the History table for
 * new rounds.
 */
export function RoundEntrySheet({
  open,
  roundNumber,
  players,
  totals,
  inputs,
  onChange,
  onCancel,
  onSubmit,
}: RoundEntrySheetProps) {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <>
      <div className="sheet-scrim" onClick={onCancel} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('scoreDetail.round', { number: roundNumber })}
      >
        <div className="sheet-grip" />
        <div className="sheet-title">{t('scoreDetail.round', { number: roundNumber })}</div>
        <div className="sheet-rows">
          {players.map((player) => (
            <div key={player.id} className="sheet-row">
              <span className="sheet-row-name">
                {player.name} <span className="sheet-row-tot">· {totals.get(player.id) ?? 0}</span>
              </span>
              <LudoNumberInput
                value={inputs[player.id] ?? 0}
                onChange={(value) => onChange(player.id, value)}
                size="sm"
              />
            </div>
          ))}
        </div>
        <div className="sheet-actions">
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onCancel} />
          <LudoButton text={t('scoreDetail.saveRound')} variant="primary" onClick={onSubmit} />
        </div>
      </div>
    </>
  )
}
