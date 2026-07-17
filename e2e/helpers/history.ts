import type { Page } from '@playwright/test'

/** Opens the match at the given index (0-based, on-screen order) from the History list via its Edit (pencil) button. */
export async function openMatchFromHistory(page: Page, index: number): Promise<void> {
  await page.locator('.list-item-row').nth(index).getByTitle('Edit').click()
}

/** Fills a round's score for a given player, matched by name against the score table's column headers. Save via `finishMatch`. */
export async function editMatchScore(
  page: Page,
  roundIndex: number,
  playerName: string,
  newScore: number,
): Promise<void> {
  const headerTexts = await page.locator('table.score-table th.score-table-header').allTextContents()
  const columnIndex = headerTexts.indexOf(playerName)
  const round = page.locator('table.score-table tbody tr.score-table-round').nth(roundIndex)
  await round.getByRole('spinbutton').nth(columnIndex).fill(String(newScore))
}
