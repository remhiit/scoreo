import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  return (
    <LudoModal
      open={open}
      title={t('home.cleanupTitle', { count: candidates.length })}
      onClose={onClose}
      footer={
        <>
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onClose} />
          <LudoButton text={t('home.deletePermanently')} variant="danger" onClick={onConfirmCleanup} />
        </>
      }
    >
      <div className="modal-body">{t('home.cleanupBody')}</div>
      <ul>
        {candidates.map((player) => (
          <li key={player.id}>{player.name || t('home.unnamedPlayer')}</li>
        ))}
      </ul>
    </LudoModal>
  )
}
