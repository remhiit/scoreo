import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { editMatchScore, openMatchFromHistory } from './helpers/history'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'
import { readLeaderboardRow } from './helpers/stats'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('editing a finished match score from History recalculates stats and ELO', async ({ page }) => {
  const playerA = `Alice ${Date.now()}`
  const playerB = `Bob ${Date.now()}`
  const gameTypeName = `Highest score ${Date.now()}`

  await addPlayer(page, playerA)
  await addPlayer(page, playerB)

  await startMatch(page, [playerA, playerB])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()

  await enterRoundScore(page, { [playerA]: 10, [playerB]: 5 })
  await finishMatch(page)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()

  await openMatchFromHistory(page, 0)
  await editMatchScore(page, 0, playerB, 15)
  await finishMatch(page)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  // EloCalculator's default starting rating is 1200, not 1000.
  const STARTING_ELO = 1200

  const rowA = await readLeaderboardRow(page, playerA)
  expect(rowA.wins).toBe(0)
  expect(rowA.losses).toBe(1)
  expect(rowA.elo).toBeLessThan(STARTING_ELO)

  const rowB = await readLeaderboardRow(page, playerB)
  expect(rowB.wins).toBe(1)
  expect(rowB.losses).toBe(0)
  expect(rowB.elo).toBeGreaterThan(STARTING_ELO)
})
