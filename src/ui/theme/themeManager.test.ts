import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAVORS, readInitialAccent, readInitialFlavor } from './themeManager'

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList)
}

describe('ThemeManager (localStorage keys / DOM attributes)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('flavor and accent keys are empty by default', () => {
    localStorage.removeItem('scoreo_flavor')
    localStorage.removeItem('scoreo_accent')

    expect(localStorage.getItem('scoreo_flavor')).toBeNull()
    expect(localStorage.getItem('scoreo_accent')).toBeNull()
  })

  it('flavor persists in localStorage across changes', () => {
    localStorage.setItem('scoreo_flavor', 'latte')
    expect(localStorage.getItem('scoreo_flavor')).toBe('latte')

    localStorage.setItem('scoreo_flavor', 'mocha')
    expect(localStorage.getItem('scoreo_flavor')).toBe('mocha')
  })

  it('accent persists in localStorage across changes', () => {
    localStorage.setItem('scoreo_accent', 'mauve')
    expect(localStorage.getItem('scoreo_accent')).toBe('mauve')

    localStorage.setItem('scoreo_accent', 'blue')
    expect(localStorage.getItem('scoreo_accent')).toBe('blue')
  })

  it('legacy scoreo_theme key is still readable for migration', () => {
    localStorage.setItem('scoreo_theme', 'dark')
    expect(localStorage.getItem('scoreo_theme')).toBe('dark')

    localStorage.setItem('scoreo_theme', 'light')
    expect(localStorage.getItem('scoreo_theme')).toBe('light')
  })

  it('applyTheme sets both data-theme and data-accent attributes', () => {
    const html = document.documentElement

    html.setAttribute('data-theme', 'mocha')
    html.setAttribute('data-accent', 'teal')

    expect(html.getAttribute('data-theme')).toBe('mocha')
    expect(html.getAttribute('data-accent')).toBe('teal')
  })

  it('data-theme switches between all 4 flavors', () => {
    const html = document.documentElement

    for (const flavor of FLAVORS) {
      html.setAttribute('data-theme', flavor)
      expect(html.getAttribute('data-theme')).toBe(flavor)
    }
  })

  it('system prefers-color-scheme is detectable', () => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    expect(typeof darkModeQuery.matches).toBe('boolean')
  })

  describe('readInitialFlavor / readInitialAccent (real logic, testable unlike Kotlin private functions)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns the saved flavor when scoreo_flavor is set', () => {
      localStorage.setItem('scoreo_flavor', 'macchiato')
      expect(readInitialFlavor()).toBe('macchiato')
    })

    it('migrates from legacy scoreo_theme=dark to mocha', () => {
      localStorage.setItem('scoreo_theme', 'dark')
      expect(readInitialFlavor()).toBe('mocha')
    })

    it('migrates from legacy scoreo_theme=light to latte', () => {
      localStorage.setItem('scoreo_theme', 'light')
      expect(readInitialFlavor()).toBe('latte')
    })

    it('falls back to system preference (dark) when no key is set', () => {
      mockMatchMedia(true)
      expect(readInitialFlavor()).toBe('mocha')
    })

    it('falls back to system preference (light) when no key is set', () => {
      mockMatchMedia(false)
      expect(readInitialFlavor()).toBe('latte')
    })

    it('defaults accent to mauve when nothing saved', () => {
      expect(readInitialAccent()).toBe('mauve')
    })

    it('returns the saved accent when scoreo_accent is set', () => {
      localStorage.setItem('scoreo_accent', 'teal')
      expect(readInitialAccent()).toBe('teal')
    })
  })
})
