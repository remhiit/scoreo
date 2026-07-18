import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { deleteMatchFromHistory } from './helpers/history'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('deleting a match from History removes it and resets the players stats', async ({ page }) => {
  const alice = `Alice ${Date.now()}`
  const bob = `Bob ${Date.now()}`
  const gameTypeName = `Highest score ${Date.now()}`

  await addPlayer(page, alice)
  await addPlayer(page, bob)

  await startMatch(page, [alice, bob])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()

  await enterRoundScore(page, { [alice]: 10, [bob]: 5 })
  await finishMatch(page)

  await deleteMatchFromHistory(page, 0)

  await expect(page.locator('.list-item-row')).toHaveCount(0)
  await expect(page.getByText('No matches yet.')).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  await expect(page.getByText('No stats yet — play some matches first.')).toBeVisible()
})
