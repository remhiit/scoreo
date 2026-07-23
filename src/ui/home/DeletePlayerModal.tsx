import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'

export interface DeletePlayerModalProps {
  open: boolean
  playerName: string | undefined
  anonymize: boolean
  onToggleAnonymize: () => void
  onClose: () => void
  onConfirmDelete: () => void
}

export function DeletePlayerModal({
  open,
  playerName,
  anonymize,
  onToggleAnonymize,
  onClose,
  onConfirmDelete,
}: DeletePlayerModalProps) {
  return (
    <LudoModal
      open={open}
      title={`Delete ${playerName ?? '?'}?`}
      onClose={onClose}
      footer={
        <>
          <LudoButton text="Cancel" variant="secondary" onClick={onClose} />
          <LudoButton text="Delete" variant="danger" onClick={onConfirmDelete} />
        </>
      }
    >
      <div className="modal-body">Matches will be preserved.</div>
      <div className="modal-row">
        <input type="checkbox" checked={anonymize} onChange={onToggleAnonymize} />
        <span>Erase name from history</span>
      </div>
    </LudoModal>
  )
}
