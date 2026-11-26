import { expect, test } from '@playwright/test'
import { createGameType } from './helpers/gameTypes'
import { enterRoundScore, finishMatch, startMatch } from './helpers/match'
import { addPlayer, clickPlayerRowAction } from './helpers/players'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate('window.localStorage.clear()')
  await page.reload()
})

test('cleaning up permanently removes deleted players who never played', async ({ page }) => {
  await addPlayer(page, 'Alice')
  await addPlayer(page, 'Bob')
  await addPlayer(page, 'Carol')

  await startMatch(page, ['Alice', 'Bob'])
  await createGameType(page, 'Belote', 'HIGHEST_SCORE')
  await page.getByRole('button', { name: 'Start match' }).click()
  await enterRoundScore(page, { Alice: 10, Bob: 5 })
  await finishMatch(page)

  // Nothing to clean up while every player is active.
  await expect(page.getByRole('button', { name: /^Clean up/ })).toHaveCount(0)

  // Bob played a match, Carol never did: only Carol is a cleanup candidate.
  await clickPlayerRowAction(page, 'Bob', 'Delete')
  await page
    .getByRole('dialog', { name: 'Delete Bob?' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await clickPlayerRowAction(page, 'Carol', 'Delete')
  await page
    .getByRole('dialog', { name: 'Delete Carol?' })
    .getByRole('button', { name: 'Delete' })
    .click()

  await page.getByRole('button', { name: 'Clean up (1)' }).click()

  const dialog = page.getByRole('dialog', { name: 'Clean up 1 inactive player(s)?' })
  await expect(dialog.getByRole('listitem')).toHaveText(['Carol'])
  await dialog.getByRole('button', { name: 'Delete permanently' }).click()

  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Clean up/ })).toHaveCount(0)
  await expect(page.getByText('Alice', { exact: true })).toBeVisible()

  // The merge dialog lists soft-deleted players too: Bob is still there, Carol is gone for good.
  await page.getByRole('button', { name: 'Merge' }).click()
  const keptSelect = page
    .getByRole('dialog', { name: 'Merge players' })
    .getByRole('combobox', { name: 'Player to keep' })
  await expect(keptSelect.getByRole('option', { name: 'Bob (deleted)' })).toHaveCount(1)
  await expect(keptSelect.getByRole('option', { name: /Carol/ })).toHaveCount(0)
})
