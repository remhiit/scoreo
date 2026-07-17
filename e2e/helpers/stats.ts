import type { Page } from '@playwright/test'

export interface LeaderboardRow {
  wins: number
  losses: number
  elo: number
}

/** Reads a leaderboard row's record/ELO from the Stats screen, matched by exact player name. */
export async function readLeaderboardRow(page: Page, playerName: string): Promise<LeaderboardRow> {
  const row = page.locator('.stats-row', { has: page.getByText(playerName, { exact: true }) })
  const recordText = await row.locator('.stats-row-record').innerText()
  const eloText = await row.locator('.stats-elo').innerText()

  const match = recordText.match(/^(\d+)W (\d+)L$/)
  if (!match) throw new Error(`Unexpected leaderboard record text for "${playerName}": "${recordText}"`)

  return { wins: Number(match[1]), losses: Number(match[2]), elo: Number(eloText) }
}
