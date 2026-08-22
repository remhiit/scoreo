import { expect, test } from '@playwright/test'
import { startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

/**
 * A scoring module keeps the identity of the game it counts — Torī Valley's
 * warm palette stays Torī Valley's inside Scoreo. That only works as long as
 * none of it escapes the module's own screen.
 *
 * The risk is concrete: the two stylesheets name tokens alike (`--color-primary`,
 * `--space-5`, `--radius-lg`…) with different values, and a stylesheet is not
 * unloaded when the player navigates away. An unscoped rule would retint and
 * re-space the whole app for the rest of the session.
 */

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

test('opening a module leaves Scoreo’s own theme untouched', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)

  const primaryBefore = await page.evaluate(readToken('--color-primary'))
  const spacingBefore = await page.evaluate(readToken('--space-5'))
  const fontBefore = await page.evaluate(BODY_FONT)

  await startMatch(page, [alice, bob])
  await page.getByRole('button', { name: /La Vallée des Torī/ }).click()
  await page.getByRole('button', { name: 'Start match' }).click()
  await expect(page.getByRole('button', { name: 'Save match' })).toBeVisible()

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

test('the module wears its own colours, not Scoreo’s', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)
  await startMatch(page, [alice, bob])
  await page.getByRole('button', { name: /La Vallée des Torī/ }).click()
  await page.getByRole('button', { name: 'Start match' }).click()

  const moduleCard = await page.evaluate(
    "getComputedStyle(document.querySelector('.module-tori-valley .card')).backgroundColor",
  )

  // Torī Valley's own surface, whatever flavor Scoreo is wearing.
  expect(moduleCard).not.toBe(await page.evaluate(readToken('--surface-card')))
})
