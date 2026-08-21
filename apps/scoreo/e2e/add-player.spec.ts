import { expect, test } from '@playwright/test'

test('adding a player from Home shows it in the player list', async ({ page }) => {
  await page.goto('/')

  const playerName = `Alice ${Date.now()}`
  await page.getByPlaceholder('Player name').fill(playerName)
  await page.getByRole('button', { name: 'Add' }).click()

  await expect(page.getByText(playerName, { exact: true })).toBeVisible()
})
