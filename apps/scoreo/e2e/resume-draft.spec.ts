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
  const round = page.locator('.hist-round').first()
  await expect(round.locator('.hist-cell', { hasText: playerA }).getByRole('spinbutton')).toHaveValue('7')
  await expect(round.locator('.hist-cell', { hasText: playerB }).getByRole('spinbutton')).toHaveValue('3')
})
