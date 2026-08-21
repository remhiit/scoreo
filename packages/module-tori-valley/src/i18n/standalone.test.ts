import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectInitialLanguage, LANG_STORAGE_KEY } from './standalone'

function stubBrowserLanguage(tag: string) {
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(tag)
}

describe('detectInitialLanguage', () => {
  // Cleared here rather than in afterEach: the shared test setup's own afterEach
  // resets the language, and its languageChanged handler writes the storage key
  // straight back.
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the language saved under Scoreo shared key', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'fr')
    stubBrowserLanguage('en-GB')

    expect(detectInitialLanguage()).toBe('fr')
  })

  it('falls back to the language this app saved before sharing that key', () => {
    localStorage.setItem('tori_valley_language', 'fr')
    stubBrowserLanguage('en-GB')

    expect(detectInitialLanguage()).toBe('fr')
  })

  it('narrows a regional tag left by the old language detector', () => {
    localStorage.setItem('tori_valley_language', 'fr-FR')
    stubBrowserLanguage('en-GB')

    expect(detectInitialLanguage()).toBe('fr')
  })

  it('prefers the shared key over the former one when both are set', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en')
    localStorage.setItem('tori_valley_language', 'fr')

    expect(detectInitialLanguage()).toBe('en')
  })

  it('falls back to the browser language when nothing is saved', () => {
    stubBrowserLanguage('fr-CA')

    expect(detectInitialLanguage()).toBe('fr')
  })

  it('falls back to English for an unsupported browser language', () => {
    stubBrowserLanguage('de-DE')

    expect(detectInitialLanguage()).toBe('en')
  })
})
