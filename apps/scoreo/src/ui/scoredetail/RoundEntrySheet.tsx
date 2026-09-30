import { Button, ButtonRow, NumberInput, Sheet, SheetRow } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../domain/model/player'

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
 * running total, over standings that stay readable behind the scrim.
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

  return (
    <Sheet
      open={open}
      title={t('scoreDetail.round', { number: roundNumber })}
      onClose={onCancel}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit}>{t('scoreDetail.saveRound')}</Button>
        </ButtonRow>
      }
    >
      {players.map((player) => (
        <SheetRow key={player.id} name={player.name} meta={totals.get(player.id) ?? 0}>
          <NumberInput
            ariaLabel={player.name}
            value={inputs[player.id] ?? 0}
            onChange={(value) => onChange(player.id, value)}
            size="sm"
          />
        </SheetRow>
      ))}
    </Sheet>
  )
}
