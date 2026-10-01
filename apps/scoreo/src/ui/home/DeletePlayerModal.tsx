import { Button, ButtonRow, Checkbox, Dialog, Text } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'

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
    <Dialog
      open={open}
      title={t('home.deleteTitle', { name: playerName ?? '?' })}
      onClose={onClose}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirmDelete}>
            {t('common.delete')}
          </Button>
        </ButtonRow>
      }
    >
      <Text block>{t('home.matchesPreserved')}</Text>
      <Checkbox checked={anonymize} onChange={onToggleAnonymize}>
        {t('home.eraseNameFromHistory')}
      </Checkbox>
    </Dialog>
  )
}
