import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { openMenuEntry } from './helpers/navigation'
import { addPlayer, clickPlayerRowAction } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()

  await addPlayer(page, 'Alice')
  await addPlayer(page, 'Bob')
  await startMatch(page, ['Alice', 'Bob'])
  await createGameType(page, 'Belote', 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { Alice: 10, Bob: 5 })
  await finishMatch(page)
})

test('deleting a player removes them from Home but keeps their matches', async ({ page }) => {
  await clickPlayerRowAction(page, 'Alice', 'Delete')

  const dialog = page.getByRole('dialog', { name: 'Delete Alice?' })
  await expect(dialog).toContainText('Matches will be preserved.')
  await expect(dialog.getByRole('checkbox', { name: 'Erase name from history' })).not.toBeChecked()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Alice', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Bob', { exact: true })).toBeVisible()

  await openMenuEntry(page, 'History')
  await expect(page.getByRole('main')).toContainText('Alice (deleted) 10')
  await expect(page.getByRole('main')).toContainText('Bob 5')
})

test('deleting a player with "Erase name from history" anonymizes their matches', async ({
  page,
}) => {
  await clickPlayerRowAction(page, 'Alice', 'Delete')

  const dialog = page.getByRole('dialog', { name: 'Delete Alice?' })
  await dialog.getByRole('checkbox', { name: 'Erase name from history' }).check()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Alice', { exact: true })).toHaveCount(0)

  await openMenuEntry(page, 'History')
  const history = page.getByRole('main')
  await expect(history).toContainText('Deleted player 10')
  await expect(history).not.toContainText('Alice')
})
