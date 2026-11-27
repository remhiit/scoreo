import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRounds, finishMatch, startMatch } from './helpers/match'
import { openMenuEntry } from './helpers/navigation'
import { addPlayer } from './helpers/players'
import { readLeaderboardRow } from './helpers/stats'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('switching a game to rounds won recomputes the matches already played', async ({ page }) => {
  await addPlayer(page, 'Alice')
  await addPlayer(page, 'Bob')

  // In points Alice wins 22-12; Bob won two rounds out of three.
  await startMatch(page, ['Alice', 'Bob'])
  await createGameType(page, 'Belote', 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRounds(page, [
    { Alice: 20, Bob: 2 },
    { Alice: 1, Bob: 5 },
    { Alice: 1, Bob: 5 },
  ])
  await finishMatch(page)

  await openMenuEntry(page, 'History')
  await expect(page.getByRole('main')).toContainText('Alice 22')
  await expect(page.getByRole('main')).toContainText('Bob 12')

  await openMenuEntry(page, 'Games')
  await page.getByRole('main').getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit Belote' })
  await edit.getByRole('combobox', { name: 'Scoring' }).selectOption('ROUNDS_WON')
  await expect(edit).toContainText('their scores will be recomputed with the new scoring')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(edit).toHaveCount(0)

  await openMenuEntry(page, 'History')
  await expect(page.getByRole('main')).not.toContainText('Alice 22')
  await expect(page.getByRole('main')).toContainText('Alice 1')
  await expect(page.getByRole('main')).toContainText('Bob 2')

  await openMenuEntry(page, 'Stats')
  const bob = await readLeaderboardRow(page, 'Bob')
  expect(bob.wins).toBe(1)
  expect(bob.losses).toBe(0)
  const alice = await readLeaderboardRow(page, 'Alice')
  expect(alice.wins).toBe(0)
  expect(alice.losses).toBe(1)
})
