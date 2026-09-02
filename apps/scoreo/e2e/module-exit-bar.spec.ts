import { expect, test, type Page } from '@playwright/test'
import { startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

/**
 * Every module registered in `apps/scoreo/src/modules/registry.ts` plays full
 * screen, behind its own controls (#388) — the host's chrome is gone, so the
 * one way back has to come from somewhere else. `.app-module-bar`'s ✕ is that
 * way, always present regardless of what the module itself draws (#389).
 *
 * This guards the promise across every registered module, the same way
 * `module-style-isolation.spec.ts` guards their stylesheets.
 */

interface ModuleUnderTest {
  /** The button offering the module in "Select a game". */
  name: RegExp
  /** From that button to a screen actually wearing the module's own controls. */
  reach: (page: Page) => Promise<void>
}

const MODULES: Record<string, ModuleUnderTest> = {
  'Torī Valley': {
    name: /La Vallée des Torī/,
    reach: async (page) => {
      await page.getByRole('button', { name: 'Start match' }).click()
      await expect(page.getByRole('button', { name: 'Save match' })).toBeVisible()
    },
  },
  '1000 Sabords': {
    name: /1000 Sabords/,
    // No setup step of its own: the module opens straight onto the turn screen.
    reach: async (page) => {
      await expect(page.locator('.module-mille-sabords .ms-table-wrap')).toBeVisible()
    },
  },
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

for (const [module, { name, reach }] of Object.entries(MODULES)) {
  test(`${module} always offers a visible way back to Scoreo`, async ({ page }) => {
    const alice = `Alice ${Date.now()}`
    const bob = `Bob ${Date.now()}`

    await addPlayer(page, alice)
    await addPlayer(page, bob)
    await startMatch(page, [alice, bob])
    await page.getByRole('button', { name }).click()
    await reach(page)

    await expect(page.locator('.app-module-bar')).toBeVisible()

    await page.getByRole('button', { name: 'Exit' }).click()

    // Back on a Scoreo route: the host's own chrome is up again.
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
  })
}
