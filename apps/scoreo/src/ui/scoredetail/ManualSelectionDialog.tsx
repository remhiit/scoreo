import { Button, ButtonRow, Dialog, List, ListRow, Text } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../domain/model/player'

export interface ManualSelectionDialogProps {
  tiedPlayers: Player[]
  selectedWinners: Set<string>
  error: string | undefined
  onToggleWinner: (playerId: string) => void
  onConfirm: () => void
  onKeepTie: () => void
  onDismiss: () => void
}

/**
 * Final manual arbitration when secondary scores fail to break a tie, or when
 * the game type uses the MANUAL_SELECTION tie-break rule. Same selectable rows
 * as the player list.
 */
export function ManualSelectionDialog({
  tiedPlayers,
  selectedWinners,
  error,
  onToggleWinner,
  onConfirm,
  onKeepTie,
  onDismiss,
}: ManualSelectionDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      open
      title={t('scoreDetail.finalDecision')}
      onClose={onDismiss}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onDismiss}>
            {t('common.cancel')}
          </Button>
          <Button variant="secondary" onClick={onKeepTie}>
            {t('scoreDetail.keepTie')}
          </Button>
          <Button onClick={onConfirm}>{t('common.confirm')}</Button>
        </ButtonRow>
      }
    >
      <List>
        {tiedPlayers.map((player) => (
          <ListRow
            key={player.id}
            title={player.name}
            selectable
            selected={selectedWinners.has(player.id)}
            onSelect={() => onToggleWinner(player.id)}
          />
        ))}
      </List>
      {error && <Text variant="error">{error}</Text>}
    </Dialog>
  )
}
