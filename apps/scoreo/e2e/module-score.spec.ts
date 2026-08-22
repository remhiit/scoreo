import { expect, test } from '@playwright/test'
import { startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

/**
 * The target scenario of the whole module effort:
 * Home → pick players → New Match → the module's game → "Play on the module" →
 * score → save → the match is in Scoreo's history, with the module's own winner.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('scoring a match on the Torī Valley module lands it in Scoreo history', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)
  await startMatch(page, [alice, bob])

  // Nothing was materialized before this click: the module has no game type of
  // its own yet, so it shows up under "Available modules", not in the game list.
  await page.getByRole('button', { name: /La Vallée des Torī/ }).click()

  // The module's own two steps: deal the Objectif cards, then enter the scores.
  await page.getByRole('button', { name: 'Start match' }).click()
  await expect(page.getByRole('button', { name: 'Save match' })).toBeVisible()

  // Torī score in series of *distinct* colours: a lone Torī is worth 0 VP, two
  // of different colours are worth 2. So Alice needs two colours to win.
  await page.getByLabel(`${alice} green Torī count`).fill('1')
  await page.getByLabel(`${alice} red Torī count`).fill('1')
  await page.getByRole('button', { name: 'Save match' }).click()

  // Back in Scoreo: one match, under the game type the module's manifest named,
  // with the winner the module ranked first. Scoped to the row, because the
  // History filter carries the same game name in a hidden <option>.
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()

  const row = page.locator('.list-item-row')
  await expect(row).toHaveCount(1)
  await expect(row.getByText('La Vallée des Torī')).toBeVisible()
  // Winners are bold: Alice alone, with the 2 VP her Torī series is worth.
  await expect(row.locator('strong')).toHaveCount(1)
  await expect(row.locator('strong')).toContainText(`${alice} 2`)

  // Reopening goes back to the module, not to Scoreo's generic score screen,
  // and the module's own grid comes back with it.
  await row.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('button', { name: 'Start match' }).click()
  await expect(page.getByLabel(`${alice} green Torī count`)).toHaveValue('1')
  await expect(page.getByLabel(`${alice} red Torī count`)).toHaveValue('1')

  // Saving again updates that match instead of adding a second one.
  await page.getByLabel(`${alice} blue Torī count`).fill('1')
  await page.getByRole('button', { name: 'Save match' }).click()

  await expect(page.locator('.list-item-row')).toHaveCount(1)
  await expect(page.locator('.list-item-row').locator('strong')).toContainText(`${alice} 4`)
})

test('a game a module counts still offers Scoreo’s own score screen', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)

  // First visit binds the game type to the module.
  await startMatch(page, [alice, bob])
  await page.getByRole('button', { name: /La Vallée des Torī/ }).click()
  await page.getByRole('button', { name: 'Start match' }).click()
  await page.goto('/')

  // Second visit: the game is in the list, and both ways in are offered —
  // `moduleId` is a capability flag, not a redirection.
  await startMatch(page, [alice, bob])
  await page.getByRole('combobox').first().selectOption({ label: 'La Vallée des Torī' })

  await expect(page.getByRole('button', { name: 'Play in Scoreo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play on the module' })).toBeVisible()
})
