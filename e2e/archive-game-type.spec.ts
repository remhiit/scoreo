import { expect, test } from '@playwright/test'
import { archiveGameType, createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('archiving a game type hides it from new matches but keeps its history', async ({ page }) => {
  const playerA = `Alice ${Date.now()}`
  const playerB = `Bob ${Date.now()}`
  const gameTypeName = `Belote ${Date.now()}`

  await addPlayer(page, playerA)
  await addPlayer(page, playerB)

  await startMatch(page, [playerA, playerB])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()

  await enterRoundScore(page, { [playerA]: 10, [playerB]: 5 })
  await finishMatch(page)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Games' }).click()

  await archiveGameType(page, gameTypeName)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Home' }).click()

  await page.getByText(playerA, { exact: true }).click()
  await page.getByText(playerB, { exact: true }).click()
  await page.getByRole('button', { name: 'New Match' }).click()

  const dialog = page.getByRole('dialog', { name: 'Select a game' })
  await expect(dialog.getByRole('option', { name: gameTypeName })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()

  const historyRow = page.locator('.list-item-row', { hasText: gameTypeName })
  await expect(historyRow).toBeVisible()
  await expect(historyRow).toContainText(`${playerA} 10`)
  await expect(historyRow).toContainText(`${playerB} 5`)
})
