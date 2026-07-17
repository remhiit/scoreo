import type { Page } from '@playwright/test'

export async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('Player name').fill(name)
  await page.getByRole('button', { name: 'Add' }).click()
}
