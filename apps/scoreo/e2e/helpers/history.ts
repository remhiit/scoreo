import type { Page } from '@playwright/test'

/** Navigates to History (via the burger menu) and opens the given match (0-indexed, in list order) for editing. */
export async function openMatchFromHistory(page: Page, index: number): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await page.getByRole('main').getByRole('button', { name: 'Edit', exact: true }).nth(index).click()
}

/** Edits a given round's score for a player, matched by player name in its "Round N" card. */
export async function editMatchScore(
  page: Page,
  roundIndex: number,
  playerName: string,
  newScore: number,
): Promise<void> {
  await page.getByRole('button', { name: 'History' }).click()
  const round = page.getByRole('region', { name: `Round ${roundIndex + 1}` })
  await round.getByRole('spinbutton', { name: playerName, exact: true }).fill(String(newScore))
}

/** Navigates to History (via the burger menu) and deletes the given match (0-indexed, in list order), confirming the modal. */
export async function deleteMatchFromHistory(page: Page, index: number): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Delete', exact: true })
    .nth(index)
    .click()
  await page
    .getByRole('dialog', { name: 'Delete match?' })
    .getByRole('button', { name: 'Delete' })
    .click()
}
