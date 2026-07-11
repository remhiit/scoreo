import type { Player } from '../../domain/model/player'
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
      {tiedPlayers.map((player) => (
        <div key={player.id} className="modal-row">
          <input
            type="checkbox"
            checked={selectedWinners.has(player.id)}
            onChange={() => onToggleWinner(player.id)}
          />
          <span>{player.name}</span>
        </div>
      ))}
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
