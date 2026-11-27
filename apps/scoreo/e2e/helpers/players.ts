import { expect, type Page } from '@playwright/test'

export async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('Player name').fill(name)
  await page.getByRole('button', { name: 'Add' }).click()
}

/**
 * Clicks one of a Home player row's icon actions ("Edit" / "Delete"). Rows
 * carry no list semantics, so the row is located through its toggle — the
 * button holding the player's name — and its actions are the buttons right
 * after it, in the row's order: Edit, then Delete.
 */
export async function clickPlayerRowAction(
  page: Page,
  playerName: string,
  action: 'Edit' | 'Delete',
): Promise<void> {
  const main = page.getByRole('main')
  await expect(main.getByText(playerName, { exact: true })).toBeVisible()
  const buttons = main.getByRole('button')
  const count = await buttons.count()
  for (let i = 0; i < count; i++) {
    if ((await buttons.nth(i).getByText(playerName, { exact: true }).count()) === 0) continue
    const target = buttons.nth(i + (action === 'Edit' ? 1 : 2))
    await expect(target).toHaveAccessibleName(action)
    await target.click()
    return
  }
  throw new Error(`No player row named "${playerName}"`)
}
