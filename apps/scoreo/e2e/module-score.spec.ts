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

  // One green Torī for Alice is enough to make her the winner.
  await page.getByLabel(`${alice} green Torī count`).fill('1')
  await page.getByRole('button', { name: 'Save match' }).click()

  // Back in Scoreo, under a game type the module's manifest named.
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText('La Vallée des Torī').first()).toBeVisible()
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
