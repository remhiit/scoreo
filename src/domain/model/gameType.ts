import type { TieBreakRule, WinCondition } from './enums'
import type { PlayerScore } from './playerScore'

export interface GameType {
  id: string
  name: string
  winCondition: WinCondition
  tieBreakRule: TieBreakRule
  tieBreakCondition: WinCondition
  tieBreakLabel: string | null
  active: boolean
}

export function computeWinners(
  gameType: GameType,
  playerScores: PlayerScore[],
  condition: WinCondition = gameType.winCondition,
): string[] {
  if (playerScores.length === 0) return []
  switch (condition) {
    case 'HIGHEST_SCORE': {
      const max = Math.max(...playerScores.map((s) => s.score))
      return playerScores.filter((s) => s.score === max).map((s) => s.playerId)
    }
    case 'LOWEST_SCORE': {
      const min = Math.min(...playerScores.map((s) => s.score))
      return playerScores.filter((s) => s.score === min).map((s) => s.playerId)
    }
    case 'MANUAL':
      return []
  }
}
