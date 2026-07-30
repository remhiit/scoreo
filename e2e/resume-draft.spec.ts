import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('resumes a draft match from the Home banner after leaving ScoreDetail without finishing', async ({ page }) => {
  const playerA = `Alice ${Date.now()}`
  const playerB = `Bob ${Date.now()}`
  const gameTypeName = `Highest score ${Date.now()}`

  await addPlayer(page, playerA)
  await addPlayer(page, playerB)

  await startMatch(page, [playerA, playerB])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()

  await enterRoundScore(page, { [playerA]: 7, [playerB]: 3 })

  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page.getByText('Resume match in progress')).toBeVisible()

  await page.getByText('Resume match in progress').click()

  await page.getByRole('button', { name: 'History' }).click()
  const headerTexts = await page.locator('table.score-table th.score-table-header').allTextContents()
  expect(headerTexts).toEqual(expect.arrayContaining([playerA, playerB]))

  const round = page.locator('table.score-table tbody tr.score-table-round').first()
  const inputs = round.getByRole('spinbutton')
  await expect(inputs.nth(headerTexts.indexOf(playerA))).toHaveValue('7')
  await expect(inputs.nth(headerTexts.indexOf(playerB))).toHaveValue('3')
})
