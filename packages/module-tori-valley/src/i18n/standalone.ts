import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  registerTranslations,
  SUPPORTED_LANGUAGES,
  TORI_VALLEY_NS,
  type SupportedLanguage,
} from './index'

/**
 * The i18next instance for running this module on its own, outside Scoreo.
 *
 * Only `main.tsx` and the test setup import this: inside Scoreo it is the host's
 * instance that gets `registerTranslations`, not this one. It deliberately mirrors
 * `apps/scoreo/src/i18n/i18n.ts` — same storage key, same fallback chain — so that
 * a language picked in either place is the language the other one starts in. Both
 * apps share the `remhiit.github.io` origin, hence the same localStorage.
 */
export const LANG_STORAGE_KEY = 'scoreo_lang'

/** Where this app stored the language before it shared Scoreo's key. Read once, never written. */
const LEGACY_LANG_STORAGE_KEY = 'tori_valley_language'

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value ?? '')
}

/** Saved language (Scoreo's key, else this app's former one), else the browser's, else `en`. */
export function detectInitialLanguage(): SupportedLanguage {
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
  if (isSupportedLanguage(saved)) return saved

  // i18next-browser-languagedetector stored the raw tag, which `load: 'languageOnly'`
  // then narrowed — so a value like `fr-FR` has to be narrowed here too.
  const legacy = window.localStorage.getItem(LEGACY_LANG_STORAGE_KEY)?.split('-')[0]
  if (isSupportedLanguage(legacy)) return legacy

  const browserLang = window.navigator.language.split('-')[0]
  if (isSupportedLanguage(browserLang)) return browserLang

  return 'en'
}

void i18next.use(initReactI18next).init({
  lng: detectInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: [TORI_VALLEY_NS],
  defaultNS: TORI_VALLEY_NS,
  interpolation: { escapeValue: false },
})

registerTranslations(i18next)

i18next.on('languageChanged', (lng) => {
  window.localStorage.setItem(LANG_STORAGE_KEY, lng)
  document.documentElement.lang = lng
})

export default i18next
