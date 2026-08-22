import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import i18n from '../i18n/i18n'

// vitest.config.ts sets `globals: false`, so @testing-library/react's automatic
// afterEach-based cleanup (which expects a global test framework) isn't wired up
// on its own — register it explicitly so DOM from one test doesn't leak into the next.
afterEach(() => {
  cleanup()
  // Reset to `en` so a language-switch test doesn't leak into the next test.
  void i18n.changeLanguage('en')
})

// No unit test may reach the network.
//
// jsdom ships a real `fetch`, and `GoogleAuthService.login()` awaits a userinfo
// request before it resolves — so a test that forgot to stub `fetch` made an
// actual HTTP call, settling at the mercy of the network. That is issue #325's
// flake: an occasional failure in a suite that is otherwise deterministic.
//
// This stub removes the network from the equation entirely. A caller that
// swallows fetch errors (`fetchAccountEmail` does, on purpose) now fails the
// same way every run instead of a different way each run; one that does not
// gets a message naming the URL it tried to reach. Tests that need a real
// response stub `fetch` themselves — see `mockUserinfo` in the Drive adapter's
// tests.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      throw new Error(
        `Unexpected network call to ${String(input)} — stub fetch in this test (see src/test/setup.ts).`,
      )
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// jsdom doesn't implement matchMedia. Default to "no preference" (light);
// individual tests can vi.spyOn(window, 'matchMedia') to simulate dark mode.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
