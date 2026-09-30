import { Button, FormRow, Stack, Text, TextInput } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'

export interface AddPlayerFieldProps {
  value: string
  onChange: (name: string) => void
  onSubmit: () => void
  error: string | undefined
}

export function AddPlayerField({ value, onChange, onSubmit, error }: AddPlayerFieldProps) {
  const { t } = useTranslation()

  return (
    <Stack gap={1}>
      <FormRow>
        <TextInput
          value={value}
          onChange={onChange}
          ariaLabel={t('home.playerNamePlaceholder')}
          placeholder={t('home.playerNamePlaceholder')}
          invalid={error !== undefined}
          onEnter={onSubmit}
        />
        <Button icon="plus" onClick={onSubmit}>
          {t('home.add')}
        </Button>
      </FormRow>
      {error && <Text variant="error">{error}</Text>}
    </Stack>
  )
}
