import type { Page } from '@playwright/test'

/**
 * Drives the "Merge two players" dialog opened from Home: picks the duplicate
 * to remove and the player to keep (by their option labels), then confirms.
 */
export async function mergePlayers(page: Page, duplicateName: string, keptName: string): Promise<void> {
  await page.getByRole('button', { name: 'Merge' }).click()
  const dialog = page.getByRole('dialog', { name: 'Merge two players' })
  await dialog.getByLabel('Duplicate to remove').selectOption({ label: duplicateName })
  await dialog.getByLabel('Player to keep').selectOption({ label: keptName })
  await dialog.getByRole('button', { name: 'Merge' }).click()
}
