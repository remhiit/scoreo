import type { Page } from '@playwright/test'

export async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('Player name').fill(name)
  await page.getByRole('button', { name: 'Add' }).click()
}

/**
 * Clicks one of a Home player row's icon actions ("Edit" / "Delete"). The row
 * is the list item named after the player, so its actions are found by name
 * inside it, whatever else the row or the page holds.
 */
export async function clickPlayerRowAction(
  page: Page,
  playerName: string,
  action: 'Edit' | 'Delete',
): Promise<void> {
  await page
    .getByRole('main')
    .getByRole('listitem', { name: playerName, exact: true })
    .getByRole('button', { name: action, exact: true })
    .click()
}
