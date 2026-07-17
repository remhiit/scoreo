import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, resolveTieManually, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'
import { readLeaderboardRow } from './helpers/stats'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('resolves a tied match manually and records the chosen winner/loser', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`
  const gameTypeName = `Manual tie-break ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)

  await createGameType(page, gameTypeName, 'HIGHEST_SCORE', { tieBreakRule: 'MANUAL_SELECTION' })

  await startMatch(page, [alice, bob])
  await page
    .getByRole('dialog', { name: 'Select a game' })
    .getByRole('combobox')
    .selectOption({ label: gameTypeName })
  await page.getByRole('button', { name: 'Start match' }).click()

  await enterRoundScore(page, { [alice]: 7, [bob]: 7 })
  await finishMatch(page)

  await expect(page.getByRole('dialog', { name: 'Final decision' })).toBeVisible()
  await resolveTieManually(page, alice)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  const aliceRow = await readLeaderboardRow(page, alice)
  expect(aliceRow.wins).toBe(1)
  expect(aliceRow.losses).toBe(0)

  const bobRow = await readLeaderboardRow(page, bob)
  expect(bobRow.wins).toBe(0)
  expect(bobRow.losses).toBe(1)
})
