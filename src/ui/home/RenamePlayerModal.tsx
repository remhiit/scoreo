import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { LudoTextInput } from '../shared/LudoTextInput'

export interface RenamePlayerModalProps {
  open: boolean
  playerName: string | undefined
  value: string
  onChange: (name: string) => void
  error: string | undefined
  onClose: () => void
  onConfirmRename: () => void
}

export function RenamePlayerModal({
  open,
  playerName,
  value,
  onChange,
  error,
  onClose,
  onConfirmRename,
}: RenamePlayerModalProps) {
  return (
    <LudoModal
      open={open}
      title={`Rename ${playerName ?? ''}`}
      onClose={onClose}
      footer={
        <>
          <LudoButton text="Cancel" variant="secondary" onClick={onClose} />
          <LudoButton text="Confirm" variant="primary" onClick={onConfirmRename} />
        </>
      }
    >
      <LudoTextInput value={value} onChange={onChange} autofocus onEnter={onConfirmRename} />
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
