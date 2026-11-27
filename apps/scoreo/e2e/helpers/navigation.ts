import type { Page } from '@playwright/test'

/** Opens the burger menu and picks the given entry (e.g. "Games", "Stats", "Theme"). */
export async function openMenuEntry(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: label, exact: true }).click()
}
