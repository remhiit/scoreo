import { describe, expect, it } from 'vitest'
import { LANDSCAPE_TYPES, OBJECTIF_VARIANTS } from '../domain/model/landscape'
import { objectifCard } from '../domain/model/objectifCard'
import i18n, { SUPPORTED_LANGUAGES } from './index'

/**
 * The card descriptors carry i18n keys the UI will render. A typo there would
 * surface as a raw key on screen rather than a failing build, so pin them here.
 */
describe('Objectif card label keys', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    it(`resolves every field label and reason in ${language}`, async () => {
      await i18n.changeLanguage(language)

      for (const landscape of LANDSCAPE_TYPES) {
        for (const variant of OBJECTIF_VARIANTS) {
          const card = objectifCard(landscape, variant)

          for (const field of card.fields) {
            expect(i18n.exists(field.labelKey), `${field.labelKey} missing in ${language}`).toBe(
              true,
            )
            expect(i18n.t(field.labelKey)).not.toBe(field.labelKey)
          }

          if (card.notComputableReasonKey) {
            expect(
              i18n.exists(card.notComputableReasonKey),
              `${card.notComputableReasonKey} missing in ${language}`,
            ).toBe(true)
          }
        }
      }
    })
  }
})
