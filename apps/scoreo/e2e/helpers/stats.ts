import type { Page } from '@playwright/test'

export interface LeaderboardRow {
  wins: number
  losses: number
  elo: number
}

/**
 * Reads a leaderboard row's record/ELO from the Stats screen, matched by exact
 * player name. A row is one button reading "<name> <W>W <L>L <ELO> <pct>%".
 */
export async function readLeaderboardRow(page: Page, playerName: string): Promise<LeaderboardRow> {
  const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const row = page.getByRole('button', { name: new RegExp(`^${escaped} \\d+W \\d+L`) })
  const text = (await row.innerText()).replace(/\s+/g, ' ').trim()

  const match = text.slice(playerName.length).match(/^ (\d+)W (\d+)L (\d+) /)
  if (!match) throw new Error(`Unexpected leaderboard row text for "${playerName}": "${text}"`)

  return { wins: Number(match[1]), losses: Number(match[2]), elo: Number(match[3]) }
}
