import type { Page } from '@playwright/test'

/** Selects the given players on Home (by name), then opens the "Select a game" modal via "New Match". */
export async function startMatch(page: Page, playerNames: string[]): Promise<void> {
  for (const name of playerNames) {
    await page.getByText(name, { exact: true }).click()
  }
  await page.getByRole('button', { name: 'New Match' }).click()
}

/** Fills the first round's score for each player, matched by name against the score table's column headers. */
export async function enterRoundScore(page: Page, scores: Record<string, number>): Promise<void> {
  await page.getByRole('button', { name: 'History' }).click()
  const headerTexts = await page.locator('table.score-table th.score-table-header').allTextContents()
  const round = page.locator('table.score-table tbody tr.score-table-round').first()
  const inputs = round.getByRole('spinbutton')

  for (const [name, value] of Object.entries(scores)) {
    const columnIndex = headerTexts.indexOf(name)
    await inputs.nth(columnIndex).fill(String(value))
  }
}

export async function finishMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Finish match' }).click()
}

/** Selects the given player as winner in the "Final decision" manual tie-break dialog, then confirms. */
export async function resolveTieManually(page: Page, winnerName: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Final decision' })
  await dialog.getByText(winnerName, { exact: true }).click()
  await dialog.getByRole('button', { name: 'Confirm' }).click()
}
