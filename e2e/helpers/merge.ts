import type { Page } from '@playwright/test'

/**
 * Drives the "Merge players" dialog opened from Home: picks the player to keep
 * (by its option label), ticks each duplicate in the list below, then confirms.
 */
export async function mergePlayers(page: Page, keptName: string, duplicateNames: string[]): Promise<void> {
  await page.getByRole('button', { name: 'Merge' }).click()
  const dialog = page.getByRole('dialog', { name: 'Merge players' })
  await dialog.getByLabel('Player to keep').selectOption({ label: keptName })
  for (const name of duplicateNames) {
    await dialog.locator('.list-item-row', { hasText: name }).click()
  }
  await dialog.getByRole('button', { name: 'Merge' }).click()
}
