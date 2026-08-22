import { expect, test } from '@playwright/test'
import { startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

/**
 * A module loaded by Scoreo must wear Scoreo's theme. Its stylesheet resolves
 * every colour against the host's semantic tokens, falling back to its own
 * palette only when nothing defines them — which is never the case here.
 */

const MODULE_CARD_BACKGROUND =
  "getComputedStyle(document.querySelector('.app-content .card')).backgroundColor"

const SURFACE_CARD = `(() => {
  const probe = document.createElement('div')
  probe.style.backgroundColor = 'var(--surface-card)'
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
})()`

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('the module’s surfaces follow Scoreo’s theme across flavors', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)
  await startMatch(page, [alice, bob])
  await page.getByRole('button', { name: /La Vallée des Torī/ }).click()
  await page.getByRole('button', { name: 'Start match' }).click()
  await expect(page.getByRole('button', { name: 'Save match' })).toBeVisible()

  await page.evaluate("document.documentElement.setAttribute('data-theme', 'latte')")
  const latte = await page.evaluate(MODULE_CARD_BACKGROUND)
  expect(latte).toBe(await page.evaluate(SURFACE_CARD))

  await page.evaluate("document.documentElement.setAttribute('data-theme', 'mocha')")
  const mocha = await page.evaluate(MODULE_CARD_BACKGROUND)
  expect(mocha).toBe(await page.evaluate(SURFACE_CARD))

  // Without this the assertions above would pass on a module that ignores the
  // theme entirely, as long as it happened to match one flavor.
  expect(latte).not.toBe(mocha)
})
