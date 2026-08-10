import { useTranslation } from 'react-i18next'
import type { Player } from '../../domain/model/player'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'

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
 * the game type uses the MANUAL_SELECTION tie-break rule.
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
    <LudoModal
      open
      title={t('scoreDetail.finalDecision')}
      onClose={onDismiss}
      footer={
        <>
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onDismiss} />
          <LudoButton text={t('scoreDetail.keepTie')} variant="secondary" onClick={onKeepTie} />
          <LudoButton text={t('common.confirm')} variant="primary" onClick={onConfirm} />
        </>
      }
    >
      <ListContainer>
        {tiedPlayers.map((player) => (
          <ListItemRow
            key={player.id}
            label={player.name}
            isSelectable
            isSelected={selectedWinners.has(player.id)}
            onSelect={() => onToggleWinner(player.id)}
          />
        ))}
      </ListContainer>
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
