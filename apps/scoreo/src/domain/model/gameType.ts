import type { ScoringMode, TieBreakRule, WinCondition } from './enums'
import type { PlayerScore } from './playerScore'

export interface GameType {
  id: string
  name: string
  winCondition: WinCondition
  /**
   * How the generic score screen turns the entered rounds into the final score:
   * `POINTS` sums them, `ROUNDS_WON` counts the rounds each player won (decided
   * by `winCondition`). Meaningless with a `MANUAL` win condition.
   */
  scoringMode: ScoringMode
  tieBreakRule: TieBreakRule
  tieBreakCondition: WinCondition
  tieBreakLabel: string | null
  active: boolean
  /**
   * The scoring module able to count this game, or `null` for a game Scoreo
   * counts on its own. A capability flag, not a redirection: the generic score
   * screen stays available for a game that has a module.
   */
  moduleId: string | null
}

/** Everything but the identity and the win condition, each defaulted by {@link newGameType}. */
export type GameTypeDefaults = Partial<Omit<GameType, 'id' | 'name' | 'winCondition'>>

/**
 * Builds a game type with the same defaults the zod schema applies when reading
 * one back: plain points, no tie-break, active, not bound to any module. A
 * `MANUAL` game always scores in points, since rounds won need the app to decide
 * who wins each round.
 */
export function newGameType(
  id: string,
  name: string,
  winCondition: WinCondition,
  defaults: GameTypeDefaults = {},
): GameType {
  return {
    id,
    name,
    winCondition,
    scoringMode: winCondition === 'MANUAL' ? 'POINTS' : (defaults.scoringMode ?? 'POINTS'),
    tieBreakRule: defaults.tieBreakRule ?? 'NONE',
    tieBreakCondition: defaults.tieBreakCondition ?? 'HIGHEST_SCORE',
    tieBreakLabel: defaults.tieBreakLabel ?? null,
    active: defaults.active ?? true,
    moduleId: defaults.moduleId ?? null,
  }
}

/** True when the final score is a count of rounds won (never with a `MANUAL` win condition). */
export function usesRoundsWon(gameType: GameType): boolean {
  return gameType.scoringMode === 'ROUNDS_WON' && gameType.winCondition !== 'MANUAL'
}

/**
 * Counts, per player, the rounds won. The winner(s) of a round hold the highest
 * (`HIGHEST_SCORE`) or lowest (`LOWEST_SCORE`) score; every tied player wins it.
 * Only players present in `rounds` get an entry; `MANUAL` wins nothing.
 */
export function computeRoundsWon(
  rounds: PlayerScore[][],
  winCondition: WinCondition,
): Map<string, number> {
  const won = new Map<string, number>()
  for (const round of rounds) {
    for (const ps of round) if (!won.has(ps.playerId)) won.set(ps.playerId, 0)
    if (winCondition === 'MANUAL' || round.length === 0) continue
    const scores = round.map((ps) => ps.score)
    const best = winCondition === 'HIGHEST_SCORE' ? Math.max(...scores) : Math.min(...scores)
    for (const ps of round) {
      if (ps.score === best) won.set(ps.playerId, (won.get(ps.playerId) ?? 0) + 1)
    }
  }
  return won
}

/**
 * Winners among `playerScores`. By default these are the game's final scores,
 * so a rounds-won game always rewards the highest count, whatever its
 * `winCondition` (which then only decides who wins each round).
 */
export function computeWinners(
  gameType: GameType,
  playerScores: PlayerScore[],
  condition: WinCondition = usesRoundsWon(gameType) ? 'HIGHEST_SCORE' : gameType.winCondition,
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
