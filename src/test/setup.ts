import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest.config.ts sets `globals: false`, so @testing-library/react's automatic
// afterEach-based cleanup (which expects a global test framework) isn't wired up
// on its own — register it explicitly so DOM from one test doesn't leak into the next.
afterEach(() => {
  cleanup()
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
