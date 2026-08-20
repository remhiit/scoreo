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

test('merging two duplicate players moves their match records onto the player kept', async ({ page }) => {
  const stamp = Date.now()
  const opponent = `Alice ${stamp}`
  const kept = `Jean-Luc ${stamp}`
  const duplicateA = `Jean Luc ${stamp}`
  const duplicateB = `JeanLuc ${stamp}`
  const gameTypeName = `Highest score ${stamp}`

  await addPlayer(page, opponent)
  await addPlayer(page, kept)
  await addPlayer(page, duplicateA)
  await addPlayer(page, duplicateB)

  // The duplicates carry the history, as after an import that spelled the same
  // person three ways.
  await startMatch(page, [opponent, duplicateA])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { [opponent]: 5, [duplicateA]: 10 })
  await finishMatch(page)

  await startMatch(page, [opponent, duplicateB])
  await page.getByRole('dialog', { name: 'Select a game' }).getByRole('combobox').selectOption({ label: gameTypeName })
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { [opponent]: 3, [duplicateB]: 12 })
  await finishMatch(page)

  await mergePlayers(page, kept, [duplicateA, duplicateB])

  await expect(page.getByText(duplicateA, { exact: true })).toHaveCount(0)
  await expect(page.getByText(duplicateB, { exact: true })).toHaveCount(0)
  await expect(page.getByText(kept, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  const keptRow = await readLeaderboardRow(page, kept)
  expect(keptRow.wins).toBe(2)
  expect(keptRow.losses).toBe(0)
})
