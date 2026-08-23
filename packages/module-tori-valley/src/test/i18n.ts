import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { registerTranslations, SUPPORTED_LANGUAGES, TORI_VALLEY_NS } from '../i18n'

/**
 * An i18next instance for the test suite, and for nothing else.
 *
 * In the app it is **Scoreo's** instance that gets `registerTranslations`, when
 * the module's chunk loads. The module has no bootstrap of its own any more — it
 * had one while it was a standalone app — but a component test still needs some
 * instance to render against, so the harness builds a minimal one here.
 *
 * No language detection, no storage: choosing a language is the host's business.
 * A test that cares picks one with `i18n.changeLanguage`.
 */
void i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: [TORI_VALLEY_NS],
  defaultNS: TORI_VALLEY_NS,
  interpolation: { escapeValue: false },
})

registerTranslations(i18next)

export default i18next
