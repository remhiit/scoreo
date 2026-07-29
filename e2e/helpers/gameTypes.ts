import type { Page } from '@playwright/test'
import type { TieBreakRule, WinCondition } from '../../src/domain/model/enums'

export interface CreateGameTypeOptions {
  /** The Home "Select a game" inline form has no tie-break field, so a rule other than the default (NONE) goes through the Games screen's full form instead. */
  tieBreakRule?: TieBreakRule
}

/**
 * Creates a game type. With no options, creates it inline from the
 * already-open "Select a game" modal (opened via the Home "New Match"
 * button) — the created game type ends up selected in the modal's dropdown.
 * With `tieBreakRule`, navigates to the Games screen instead (the only form
 * exposing tie-break configuration) and back to Home once done.
 */
export async function createGameType(
  page: Page,
  name: string,
  winCondition: WinCondition,
  options: CreateGameTypeOptions = {},
): Promise<void> {
  if (options.tieBreakRule === undefined) {
    const dialog = page.getByRole('dialog', { name: 'Select a game' })
    await dialog.getByRole('button', { name: '＋' }).click()
    await dialog.getByPlaceholder('Game name').fill(name)
    await dialog.locator('.inline-form').getByRole('combobox').selectOption(winCondition)
    await dialog.getByRole('button', { name: 'Add game' }).click()
    return
  }

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Games' }).click()
  await page.getByPlaceholder('Game name').fill(name)
  const selects = page.locator('select.select')
  await selects.nth(0).selectOption(winCondition)
  await selects.nth(1).selectOption(options.tieBreakRule)
  await page.getByRole('button', { name: 'Add game type' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Home' }).click()
}

/**
 * Archives the named game type from the Games screen: clicks its Delete
 * (trash) icon, then confirms in the "Archive <name>?" modal.
 */
export async function archiveGameType(page: Page, name: string): Promise<void> {
  const row = page.locator('.list-item-row', { hasText: name })
  await row.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: `Archive ${name}?` }).getByRole('button', { name: 'Archive' }).click()
}
