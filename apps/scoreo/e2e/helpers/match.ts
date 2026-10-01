import type { Page } from '@playwright/test'

/** Selects the given players on Home (by name), then opens the "Select a game" modal via "New Match". */
export async function startMatch(page: Page, playerNames: string[]): Promise<void> {
  for (const name of playerNames) {
    await page.getByText(name, { exact: true }).click()
  }
  await page.getByRole('button', { name: 'New Match' }).click()
}

/**
 * Picks a game in the open "Select a game" modal by its label — an existing
 * game type, or a module no game type is bound to yet.
 */
export async function chooseGame(page: Page, gameLabel: string): Promise<void> {
  await page.getByRole('dialog').getByRole('combobox').first().selectOption({ label: gameLabel })
}

/** Fills the first round's score for each player, matched by player name in the "Round 1" card. */
export async function enterRoundScore(page: Page, scores: Record<string, number>): Promise<void> {
  await page.getByRole('button', { name: 'History' }).click()
  const round = page.getByRole('region', { name: 'Round 1' })

  for (const [name, value] of Object.entries(scores)) {
    await round.getByRole('spinbutton', { name, exact: true }).fill(String(value))
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
