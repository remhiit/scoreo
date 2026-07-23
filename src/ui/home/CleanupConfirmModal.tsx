import type { Player } from '../../domain/model/player'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'

export interface CleanupConfirmModalProps {
  open: boolean
  candidates: Player[]
  onClose: () => void
  onConfirmCleanup: () => void
}

export function CleanupConfirmModal({
  open,
  candidates,
  onClose,
  onConfirmCleanup,
}: CleanupConfirmModalProps) {
  return (
    <LudoModal
      open={open}
      title={`Clean up ${candidates.length} inactive player(s)?`}
      onClose={onClose}
      footer={
        <>
          <LudoButton text="Cancel" variant="secondary" onClick={onClose} />
          <LudoButton text="Delete permanently" variant="danger" onClick={onConfirmCleanup} />
        </>
      }
    >
      <div className="modal-body">
        This permanently deletes players with no recorded match. This cannot be undone.
      </div>
      <ul>
        {candidates.map((player) => (
          <li key={player.id}>{player.name || '(unnamed player)'}</li>
        ))}
      </ul>
    </LudoModal>
  )
}
