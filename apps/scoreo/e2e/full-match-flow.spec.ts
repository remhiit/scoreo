import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { addPlayer } from './helpers/players'
import { readLeaderboardRow } from './helpers/stats'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('completes a full match and updates the winner/loser stats and ELO', async ({ page }) => {
  const winner = `Alice ${Date.now()}`
  const loser = `Bob ${Date.now()}`
  const gameTypeName = `Highest score ${Date.now()}`

  await addPlayer(page, winner)
  await addPlayer(page, loser)

  await startMatch(page, [winner, loser])
  await createGameType(page, gameTypeName, 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()

  await enterRoundScore(page, { [winner]: 10, [loser]: 5 })
  await finishMatch(page)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Stats' }).click()

  // EloCalculator's default starting rating is 1200, not 1000 — a single win/loss
  // moves each player's ELO away from that baseline rather than from 1000.
  const STARTING_ELO = 1200

  const winnerRow = await readLeaderboardRow(page, winner)
  expect(winnerRow.wins).toBe(1)
  expect(winnerRow.losses).toBe(0)
  expect(winnerRow.elo).toBeGreaterThan(STARTING_ELO)

  const loserRow = await readLeaderboardRow(page, loser)
  expect(loserRow.wins).toBe(0)
  expect(loserRow.losses).toBe(1)
  expect(loserRow.elo).toBeLessThan(STARTING_ELO)
})
