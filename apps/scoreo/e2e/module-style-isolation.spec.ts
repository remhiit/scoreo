import { expect, test, type Page } from '@playwright/test'
import { chooseGame, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

/**
 * A scoring module adopts Scoreo's identity by composing the design system;
 * until it has migrated, it still wears its legacy palette — Torī Valley's warm
 * washi, 1000 Sabords' night sky. Either way, none of a module's own CSS may
 * escape the module's screen.
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
  /** The module's entry in the "Select a game" list. */
  game: string
  /** From that entry to a screen actually wearing the module's stylesheet. */
  reach: (page: Page) => Promise<void>
  /**
   * The module's reference surface: its own colour while `identity` is `'own'`,
   * the host's `--surface-card` once it is `'scoreo'`.
   */
  surface: string
  /**
   * Whose look the module wears. `'own'`: its legacy palette, kept apart from
   * Scoreo's. `'scoreo'`: it composes the design system and adopts the host's
   * identity (doc/technical/module-contract.md). Every module moves to
   * `'scoreo'` with its migration; a new module starts there.
   */
  identity: 'own' | 'scoreo'
}

const MODULES: Record<string, ModuleUnderTest> = {
  'Torī Valley': {
    game: 'La Vallée des Torī',
    reach: async (page) => {
      await page.getByRole('button', { name: 'Start match' }).click()
      await expect(page.getByRole('button', { name: 'Save match' })).toBeVisible()
    },
    surface: '.module-tori-valley .tv-card',
    identity: 'own',
  },
  '1000 Sabords': {
    game: '1000 Sabords',
    // No setup step of its own: the module opens straight onto the turn screen,
    // scoreboard included.
    reach: async (page) => {
      await expect(page.locator('.module-mille-sabords .ms-table-wrap')).toBeVisible()
    },
    surface: '.module-mille-sabords .ms-table-wrap',
    identity: 'own',
  },
  Skyjo: {
    game: 'Skyjo',
    // No setup step of its own: the module opens straight onto the round-entry
    // screen, scoreboard included.
    reach: async (page) => {
      await expect(page.locator('.module-skyjo .sj-table-wrap')).toBeVisible()
    },
    surface: '.module-skyjo .sj-table-wrap',
    identity: 'own',
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

const openModule = async (page: Page, game: string, reach: (page: Page) => Promise<void>) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)
  await startMatch(page, [alice, bob])
  await chooseGame(page, game)
  await page.getByRole('button', { name: 'Play on the module' }).click()
  await reach(page)
}

const surfaceColour = (page: Page, surface: string) =>
  page.evaluate(`getComputedStyle(document.querySelector('${surface}')).backgroundColor`)

for (const [module, { game, reach, surface, identity }] of Object.entries(MODULES)) {
  test(`opening ${module} leaves Scoreo’s own theme untouched`, async ({ page }) => {
    const alice = `Alice ${Date.now()}`
    const bob = `Bob ${Date.now()}`

    await addPlayer(page, alice)
    await addPlayer(page, bob)

    const primaryBefore = await page.evaluate(readToken('--color-primary'))
    const spacingBefore = await page.evaluate(readToken('--space-5'))
    const fontBefore = await page.evaluate(BODY_FONT)

    await startMatch(page, [alice, bob])
    await chooseGame(page, game)
    await page.getByRole('button', { name: 'Play on the module' }).click()
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

  if (identity === 'own') {
    test(`${module} wears its own colours, not Scoreo’s`, async ({ page }) => {
      await openModule(page, game, reach)

      // The module's own surface, whatever flavor Scoreo is wearing.
      expect(await surfaceColour(page, surface)).not.toBe(
        await page.evaluate(readToken('--surface-card')),
      )
    })
  } else {
    test(`${module} wears Scoreo’s colours`, async ({ page }) => {
      await openModule(page, game, reach)

      // Composed from the design system: the host's card surface, in whichever
      // flavor Scoreo is wearing.
      expect(await surfaceColour(page, surface)).toBe(
        await page.evaluate(readToken('--surface-card')),
      )
    })
  }
}
