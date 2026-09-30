import { Button, ButtonRow, Dialog, TextInput } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'

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
  const title = t('home.renameTitle', { name: playerName ?? '' })

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirmRename}>{t('common.confirm')}</Button>
        </ButtonRow>
      }
    >
      <TextInput
        value={value}
        onChange={onChange}
        ariaLabel={title}
        error={error}
        autoFocus
        onEnter={onConfirmRename}
      />
    </Dialog>
  )
}
