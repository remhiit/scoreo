import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  return (
    <LudoModal
      open={open}
      title={t('home.deleteTitle', { name: playerName ?? '?' })}
      onClose={onClose}
      footer={
        <>
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onClose} />
          <LudoButton text={t('common.delete')} variant="danger" onClick={onConfirmDelete} />
        </>
      }
    >
      <div className="modal-body">{t('home.matchesPreserved')}</div>
      <div className="modal-row">
        <input type="checkbox" checked={anonymize} onChange={onToggleAnonymize} />
        <span>{t('home.eraseNameFromHistory')}</span>
      </div>
    </LudoModal>
  )
}
