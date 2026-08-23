import { defineConfig, devices } from '@playwright/test'

/**
 * Visual regression suite — see doc/technical/visual-testing.md.
 *
 * Deliberately separate from the two other suites: Vitest/jsdom asserts on the
 * DOM and stays fast, `e2e/` drives real flows and asserts on behaviour, and
 * this one renders real pixels from the production build and compares them to
 * committed baselines. Chromium only — this is a phone-first PWA, and every
 * extra browser multiplies the committed PNGs.
 */

/** Neither vite preview's default 4173 nor the e2e suite's, so no server is ever mistaken for ours. */
const PORT = 4183

/**
 * Scoreo scrolls its content inside the shell rather than the document, so a
 * full-page capture at a real device height would hold nothing but the first
 * screenful — and a scoring screen runs for metres. Each viewport therefore
 * keeps its target's **width**, which is what drives every breakpoint, and takes
 * whatever height it needs for the tallest screen to be laid out in one go.
 */
const TALL = 4600

export default defineConfig({
  testDir: './tests/visual',
  // Baselines are pixel-exact, so a retry could only ever hide a real regression.
  retries: 0,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : [['list']],

  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      // Absorbs the odd antialiasing pixel without masking a layout regression:
      // 0.1% of a 412-wide phone screenshot is a shift too small to see.
      maxDiffPixelRatio: 0.001,
    },
  },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Pinned so any locale-dependent formatting can't shift a baseline from one
    // machine to the next.
    locale: 'en-GB',
    timezoneId: 'UTC',
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'phone',
      // The primary target: the app is used on a phone, at the table.
      use: { ...devices['Pixel 7'], viewport: { width: 412, height: TALL } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: TALL } },
    },
  ],

  // Screenshots the build that actually ships, not the dev server.
  // Invoked through node_modules/.bin rather than `pnpm exec` so the same command
  // works inside the Playwright container image, which has no pnpm.
  webServer: {
    // --host 127.0.0.1 is not optional: left to itself `vite preview` binds
    // "localhost", which on a dual-stack machine resolves to ::1 only, and the
    // readiness probe below (an IPv4 address) then never connects.
    command: `node_modules/.bin/vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
