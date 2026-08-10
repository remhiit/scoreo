import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/i18n'
import { LudoButton } from './LudoButton'
import { LudoModal } from './LudoModal'

export interface LanguagePickerDialogProps {
  onClose: () => void
}

const LANGUAGE_LABEL_KEY: Record<SupportedLanguage, string> = {
  en: 'languagePicker.english',
  fr: 'languagePicker.french',
}

/** Language picker, opened from the burger menu. Modeled on ThemePickerDialog. */
export function LanguagePickerDialog({ onClose }: LanguagePickerDialogProps) {
  const { t, i18n } = useTranslation()

  return (
    <LudoModal
      open
      title={t('languagePicker.title')}
      onClose={onClose}
      footer={<LudoButton text={t('common.close')} variant="secondary" onClick={onClose} />}
    >
      <div className="theme-picker-row">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            className={lang === i18n.language ? 'theme-chip theme-chip--active' : 'theme-chip'}
            onClick={() => void i18n.changeLanguage(lang)}
          >
            {t(LANGUAGE_LABEL_KEY[lang])}
          </button>
        ))}
      </div>
    </LudoModal>
  )
}
