import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { addPlayer, clickPlayerRowAction } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()

  await addPlayer(page, 'Aice')
  await addPlayer(page, 'Bob')
  await startMatch(page, ['Aice', 'Bob'])
  await createGameType(page, 'Belote', 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { Aice: 10, Bob: 5 })
  await finishMatch(page)
})

test('renaming a player fixes the name and keeps their record', async ({ page }) => {
  await clickPlayerRowAction(page, 'Aice', 'Edit')

  const dialog = page.getByRole('dialog', { name: 'Rename Aice' })
  const input = dialog.getByRole('textbox', { name: 'Rename Aice' })
  await expect(input).toHaveValue('Aice')
  await input.fill('Alice')
  await input.press('Enter')

  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Aice', { exact: true })).toHaveCount(0)
  const row = page.getByRole('button', { name: /^Alice 1W 0L/ })
  await expect(row).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByRole('main')).toContainText('Alice 10')
})

test('cancelling a rename keeps the old name', async ({ page }) => {
  await clickPlayerRowAction(page, 'Aice', 'Edit')

  const dialog = page.getByRole('dialog', { name: 'Rename Aice' })
  await dialog.getByRole('textbox', { name: 'Rename Aice' }).fill('Alycia')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Aice', { exact: true })).toBeVisible()
  await expect(page.getByText('Alycia', { exact: true })).toHaveCount(0)
})
