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

test('editing a finished match from History recomputes stats and ELO for the new result', async ({ page }) => {
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

  await openMatchFromHistory(page, 0)
  await editMatchScore(page, 0, alice, 2)
  await editMatchScore(page, 0, bob, 8)
  await finishMatch(page)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  // EloCalculator's default starting rating is 1200, not 1000.
  const STARTING_ELO = 1200

  const aliceRow = await readLeaderboardRow(page, alice)
  expect(aliceRow.wins).toBe(0)
  expect(aliceRow.losses).toBe(1)
  expect(aliceRow.elo).toBeLessThan(STARTING_ELO)

  const bobRow = await readLeaderboardRow(page, bob)
  expect(bobRow.wins).toBe(1)
  expect(bobRow.losses).toBe(0)
  expect(bobRow.elo).toBeGreaterThan(STARTING_ELO)
})
