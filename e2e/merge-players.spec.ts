import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { mergePlayers } from './helpers/merge'
import { addPlayer } from './helpers/players'
import { readLeaderboardRow } from './helpers/stats'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('merging a duplicate player moves their match record onto the player kept', async ({ page }) => {
  const opponent = `Alice ${Date.now()}`
  const kept = `Jean-Luc ${Date.now()}`
  const duplicate = `Jean Luc ${Date.now()}`
  const gameTypeName = `Highest score ${Date.now()}`

  await addPlayer(page, opponent)
  await addPlayer(page, kept)
  await addPlayer(page, duplicate)

  // The duplicate is the one carrying the history, as after a name-mismatched import.
  await startMatch(page, [opponent, duplicate])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { [opponent]: 5, [duplicate]: 10 })
  await finishMatch(page)

  await mergePlayers(page, duplicate, kept)

  await expect(page.getByText(duplicate, { exact: true })).toHaveCount(0)
  await expect(page.getByText(kept, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  const keptRow = await readLeaderboardRow(page, kept)
  expect(keptRow.wins).toBe(1)
  expect(keptRow.losses).toBe(0)
})
