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
  return (
    <LudoModal
      open
      title="Final decision"
      onClose={onDismiss}
      footer={
        <>
          <LudoButton text="Cancel" variant="secondary" onClick={onDismiss} />
          <LudoButton text="Keep tie" variant="secondary" onClick={onKeepTie} />
          <LudoButton text="Confirm" variant="primary" onClick={onConfirm} />
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
