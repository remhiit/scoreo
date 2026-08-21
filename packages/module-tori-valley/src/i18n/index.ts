import type { i18n as I18nInstance } from 'i18next'
import { en } from './locales/en'
import { fr } from './locales/fr'

/**
 * The i18next namespace this module's translations live under.
 *
 * The module is on its way to being rendered inside Scoreo, which owns the
 * i18next instance and already has a `translation` namespace of its own. Keeping
 * these strings in a namespace of their own means the two sets can never collide,
 * and the host registers them with `registerTranslations` rather than merging
 * dictionaries.
 */
export const TORI_VALLEY_NS = 'tori-valley'

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Adds this module's dictionaries to an existing i18next instance. Idempotent. */
export function registerTranslations(i18n: I18nInstance): void {
  i18n.addResourceBundle('en', TORI_VALLEY_NS, en, true, true)
  i18n.addResourceBundle('fr', TORI_VALLEY_NS, fr, true, true)
}
