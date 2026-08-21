import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  return (
    <LudoModal
      open={open}
      title={t('home.renameTitle', { name: playerName ?? '' })}
      onClose={onClose}
      footer={
        <>
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onClose} />
          <LudoButton text={t('common.confirm')} variant="primary" onClick={onConfirmRename} />
        </>
      }
    >
      <LudoTextInput value={value} onChange={onChange} autofocus onEnter={onConfirmRename} />
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
