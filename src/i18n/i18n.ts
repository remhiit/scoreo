import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'

export const LANG_STORAGE_KEY = 'scoreo_lang'
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value ?? '')
}

/** Saved language, else the browser's language if supported, else `en`. */
export function detectInitialLanguage(): SupportedLanguage {
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
  if (isSupportedLanguage(saved)) return saved

  const browserLang = window.navigator.language.split('-')[0]
  if (isSupportedLanguage(browserLang)) return browserLang

  return 'en'
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18next.on('languageChanged', (lng) => {
  window.localStorage.setItem(LANG_STORAGE_KEY, lng)
})

export default i18next
