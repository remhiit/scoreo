import { expect, test } from '@playwright/test'
import { importFixture } from './helpers/importFile'
import { openMenuEntry } from './helpers/navigation'
import { readLeaderboardRow } from './helpers/stats'

// fixtures/stats-sample.json — five dated "Belote Stats" matches (March–April 2023):
//   Alice beats Bob, Alice beats Carol, Bob beats Alice, Alice beats Bob, Carol beats Bob.
// Alice 3W 1L, Bob 1W 3L, Carol 1W 1L.
test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await importFixture(page, 'stats-sample.json')
  await openMenuEntry(page, 'Stats')
})

test('the leaderboard ranks players by ELO with their record', async ({ page }) => {
  const rows = page.getByRole('main').getByRole('button', { name: / \d+W \d+L / })
  await expect(rows).toHaveCount(3)
  await expect(rows.first()).toContainText('Alice Stats')

  const alice = await readLeaderboardRow(page, 'Alice Stats')
  expect([alice.wins, alice.losses]).toEqual([3, 1])
  const bob = await readLeaderboardRow(page, 'Bob Stats')
  expect([bob.wins, bob.losses]).toEqual([1, 3])
  const carol = await readLeaderboardRow(page, 'Carol Stats')
  expect([carol.wins, carol.losses]).toEqual([1, 1])
  expect(alice.elo).toBeGreaterThan(carol.elo)
  expect(carol.elo).toBeGreaterThan(bob.elo)
})

test("a player's page shows their record, head-to-head and trophies", async ({ page }) => {
  await page.getByRole('button', { name: /^Alice Stats / }).click()

  const main = page.getByRole('main')
  await expect(main.getByText('Alice Stats', { exact: true })).toBeVisible()
  await expect(main.getByText('3W / 1L', { exact: true })).toBeVisible()
  await expect(main.getByText('75%', { exact: true })).toBeVisible()

  const headToHead = page.getByRole('region', { name: 'Head-to-head' })
  await expect(headToHead).toContainText('Bob Stats')
  await expect(headToHead).toContainText('2 - 1')
  await expect(headToHead).toContainText('Carol Stats')
  await expect(headToHead).toContainText('1 - 0')

  const trophies = page.getByRole('region', { name: 'Trophies' })
  await expect(trophies).toContainText('The Invincible')
  await expect(trophies).toContainText('The Collector')
  await expect(trophies).toContainText('Game Record')
  await expect(trophies).toContainText('Monthly Champions — Apr 2023')
  await expect(trophies).toContainText('Monthly Champions — Mar 2023')

  // Back leaves the player's page for the leaderboard.
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: /^Bob Stats / })).toBeVisible()
})

test('head-to-head reads the same meetings from both sides', async ({ page }) => {
  await page.getByRole('button', { name: /^Bob Stats / }).click()

  const headToHead = page.getByRole('region', { name: 'Head-to-head' })
  await expect(headToHead).toContainText('Alice Stats')
  await expect(headToHead).toContainText('1 - 2')
  await expect(headToHead).toContainText('Carol Stats')
  await expect(headToHead).toContainText('0 - 1')

  await expect(page.getByRole('region', { name: 'Trophies' })).toContainText('Streak Breaker')
})
