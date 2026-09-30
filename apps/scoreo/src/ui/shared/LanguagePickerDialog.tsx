import { Button, ButtonRow, Chip, Dialog, Stack } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/i18n'

export interface LanguagePickerDialogProps {
  onClose: () => void
}

const LANGUAGE_LABEL_KEY: Record<SupportedLanguage, string> = {
  en: 'languagePicker.english',
  fr: 'languagePicker.french',
}

const LANGUAGE_FLAG: Record<SupportedLanguage, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
}

/** Language picker, opened from the burger menu. Modeled on ThemePickerDialog. */
export function LanguagePickerDialog({ onClose }: LanguagePickerDialogProps) {
  const { t, i18n } = useTranslation()

  return (
    <Dialog
      open
      title={t('languagePicker.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow align="end">
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </ButtonRow>
      }
    >
      <Stack direction="row" gap={2} wrap>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Chip
            key={lang}
            selected={lang === i18n.language}
            onClick={() => void i18n.changeLanguage(lang)}
          >
            <span aria-hidden="true">{LANGUAGE_FLAG[lang]}</span>
            <span>{t(LANGUAGE_LABEL_KEY[lang])}</span>
          </Chip>
        ))}
      </Stack>
    </Dialog>
  )
}
