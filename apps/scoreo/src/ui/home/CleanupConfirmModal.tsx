import { BulletList, Button, ButtonRow, Dialog, Text } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../domain/model/player'

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
    <Dialog
      open={open}
      title={t('home.cleanupTitle', { count: candidates.length })}
      onClose={onClose}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirmCleanup}>
            {t('home.deletePermanently')}
          </Button>
        </ButtonRow>
      }
    >
      <Text block>{t('home.cleanupBody')}</Text>
      <BulletList items={candidates.map((player) => player.name || t('home.unnamedPlayer'))} />
    </Dialog>
  )
}
