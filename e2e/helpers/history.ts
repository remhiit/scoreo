import type { Page } from '@playwright/test'

/** Navigates to History (via the burger menu) and opens the given match (0-indexed, in list order) for editing. */
export async function openMatchFromHistory(page: Page, index: number): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await page.locator('.list-item-row').nth(index).getByRole('button', { name: 'Edit' }).click()
}

/** Edits a given round's score for a player, matched by name against its `.hist-cell`. */
export async function editMatchScore(
  page: Page,
  roundIndex: number,
  playerName: string,
  newScore: number,
): Promise<void> {
  await page.getByRole('button', { name: 'History' }).click()
  const round = page.locator('.hist-round').nth(roundIndex)
  await round.locator('.hist-cell', { hasText: playerName }).getByRole('spinbutton').fill(String(newScore))
}

/** Navigates to History (via the burger menu) and deletes the given match (0-indexed, in list order), confirming the modal. */
export async function deleteMatchFromHistory(page: Page, index: number): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await page.locator('.list-item-row').nth(index).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete match?' }).getByRole('button', { name: 'Delete' }).click()
}
