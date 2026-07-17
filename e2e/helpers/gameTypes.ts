import type { Page } from '@playwright/test'
import type { WinCondition } from '../../src/domain/model/enums'

/**
 * Creates a game type inline from the already-open "Select a game" modal
 * (opened via the Home "New Match" button). The created game type ends up
 * selected in the modal's dropdown.
 */
export async function createGameType(page: Page, name: string, winCondition: WinCondition): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Select a game' })
  await dialog.getByRole('button', { name: '＋' }).click()
  await dialog.getByPlaceholder('Game name').fill(name)
  await dialog.locator('.inline-form').getByRole('combobox').selectOption(winCondition)
  await dialog.getByRole('button', { name: 'Add game' }).click()
}

/**
 * Archives the named game type from the Games screen: clicks its Delete
 * (trash) icon, then confirms in the "Archive <name>?" modal.
 */
export async function archiveGameType(page: Page, name: string): Promise<void> {
  const row = page.locator('.list-item-row', { hasText: name })
  await row.getByTitle('Delete').click()
  await page.getByRole('dialog', { name: `Archive ${name}?` }).getByRole('button', { name: 'Archive' }).click()
}
