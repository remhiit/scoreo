import { expect, test, type Page } from '@playwright/test'
import { startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

/**
 * A scoring module keeps the identity of the game it counts — Torī Valley's
 * warm palette stays Torī Valley's inside Scoreo, 1000 Sabords' night sky stays
 * its own. That only works as long as none of it escapes the module's screen.
 *
 * The risk is concrete: the stylesheets name tokens alike (`--color-primary`,
 * `--space-5`, `--radius-lg`…) with different values, and a stylesheet is not
 * unloaded when the player navigates away. An unscoped rule would retint and
 * re-space the whole app for the rest of the session.
 *
 * Every module registered in `apps/scoreo/src/modules/registry.ts` is guarded
 * here: the boundary is the contract, not a property of one module.
 */

interface ModuleUnderTest {
  /** The button offering the module in "Select a game". */
  name: RegExp
  /** From that button to a screen actually wearing the module's stylesheet. */
  reach: (page: Page) => Promise<void>
  /** One of the module's own surfaces, which must not be the host's. */
  surface: string
}

const MODULES: Record<string, ModuleUnderTest> = {
  'Torī Valley': {
    name: /La Vallée des Torī/,
    reach: async (page) => {
      await page.getByRole('button', { name: 'Start match' }).click()
      await expect(page.getByRole('button', { name: 'Save match' })).toBeVisible()
    },
    surface: '.module-tori-valley .tv-card',
  },
  '1000 Sabords': {
    name: /1000 Sabords/,
    // No setup step of its own: the module opens straight onto the turn screen,
    // scoreboard included.
    reach: async (page) => {
      await expect(page.locator('.module-mille-sabords .ms-table-wrap')).toBeVisible()
    },
    surface: '.module-mille-sabords .ms-table-wrap',
  },
}

const readToken = (name: string) => `(() => {
  const probe = document.createElement('div')
  probe.style.backgroundColor = 'var(${name})'
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
})()`

const BODY_FONT = 'getComputedStyle(document.body).fontFamily'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

for (const [module, { name, reach, surface }] of Object.entries(MODULES)) {
  test(`opening ${module} leaves Scoreo’s own theme untouched`, async ({ page }) => {
    const alice = `Alice ${Date.now()}`
    const bob = `Bob ${Date.now()}`

    await addPlayer(page, alice)
    await addPlayer(page, bob)

    const primaryBefore = await page.evaluate(readToken('--color-primary'))
    const spacingBefore = await page.evaluate(readToken('--space-5'))
    const fontBefore = await page.evaluate(BODY_FONT)

    await startMatch(page, [alice, bob])
    await page.getByRole('button', { name }).click()
    await reach(page)

    // The module's stylesheet is loaded now — and must have changed nothing here.
    expect(await page.evaluate(readToken('--color-primary'))).toBe(primaryBefore)
    expect(await page.evaluate(readToken('--space-5'))).toBe(spacingBefore)
    expect(await page.evaluate(BODY_FONT)).toBe(fontBefore)

    // Still nothing after leaving: a stylesheet stays loaded for the session.
    await page.goto('/')
    expect(await page.evaluate(readToken('--color-primary'))).toBe(primaryBefore)
    expect(await page.evaluate(readToken('--space-5'))).toBe(spacingBefore)
    expect(await page.evaluate(BODY_FONT)).toBe(fontBefore)
  })

  test(`${module} wears its own colours, not Scoreo’s`, async ({ page }) => {
    const alice = `Alice ${Date.now()}`
    const bob = `Bob ${Date.now()}`

    await addPlayer(page, alice)
    await addPlayer(page, bob)
    await startMatch(page, [alice, bob])
    await page.getByRole('button', { name }).click()
    await reach(page)

    const moduleSurface = await page.evaluate(
      `getComputedStyle(document.querySelector('${surface}')).backgroundColor`,
    )

    // The module's own surface, whatever flavor Scoreo is wearing.
    expect(moduleSurface).not.toBe(await page.evaluate(readToken('--surface-card')))
  })
}
