import type { ScoringMode, TieBreakRule, WinCondition } from './enums'
import type { PlayerScore } from './playerScore'

export interface GameType {
  id: string
  name: string
  winCondition: WinCondition
  /**
   * How the generic score screen turns the entered rounds into the final score:
   * `POINTS` sums them, `ROUNDS_WON` counts the rounds each player won (decided
   * by `winCondition`). Meaningless with a `MANUAL` win condition, and for a
   * game bound to a scoring module (the module computes its own scores, in
   * points): see {@link effectiveScoringMode}.
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
 * one back: plain points, no tie-break, active, not bound to any module. The
 * stored scoring mode is the effective one ({@link effectiveScoringMode}).
 */
export function newGameType(
  id: string,
  name: string,
  winCondition: WinCondition,
  defaults: GameTypeDefaults = {},
): GameType {
  const moduleId = defaults.moduleId ?? null
  return {
    id,
    name,
    winCondition,
    scoringMode: effectiveScoringMode({
      winCondition,
      scoringMode: defaults.scoringMode ?? 'POINTS',
      moduleId,
    }),
    tieBreakRule: defaults.tieBreakRule ?? 'NONE',
    tieBreakCondition: defaults.tieBreakCondition ?? 'HIGHEST_SCORE',
    tieBreakLabel: defaults.tieBreakLabel ?? null,
    active: defaults.active ?? true,
    moduleId,
  }
}

/** The fields that decide a game type's effective scoring mode. */
export type ScoringModeInputs = Pick<GameType, 'winCondition' | 'scoringMode' | 'moduleId'>

/**
 * The scoring mode a game type actually scores with, and stores:
 * - a game bound to a scoring module (`moduleId !== null`) scores in points,
 *   since the module computes its own scores and every module counts points
 *   today (the module declaring its mode is #590);
 * - rounds won only makes sense when the app decides who wins each round, so a
 *   `MANUAL` game scores in points too.
 */
export function effectiveScoringMode(gameType: ScoringModeInputs): ScoringMode {
  if (gameType.moduleId !== null) return 'POINTS'
  return gameType.winCondition === 'MANUAL' ? 'POINTS' : gameType.scoringMode
}

/** True when the final score is a count of rounds won (never for a `MANUAL` or module-bound game). */
export function usesRoundsWon(gameType: ScoringModeInputs): boolean {
  return effectiveScoringMode(gameType) === 'ROUNDS_WON'
}

/**
 * True when `before` and `after` derive a different final score from the same
 * round detail: the effective scoring mode changes, or — in rounds won — who
 * wins a round does (a points sum ignores the win condition). This is when
 * stored matches are recomputed (`rescoreMatch`), and when the game type form
 * warns about it.
 */
export function roundScoringChanged(before: ScoringModeInputs, after: ScoringModeInputs): boolean {
  if (usesRoundsWon(before) !== usesRoundsWon(after)) return true
  return usesRoundsWon(after) && before.winCondition !== after.winCondition
}

/**
 * Counts, per player, the rounds won. The winner(s) of a round hold the highest
 * (`HIGHEST_SCORE`) or lowest (`LOWEST_SCORE`) score; every tied player wins it.
 * `MANUAL` wins nothing. With `participants`, a participant missing from a
 * non-empty round counts as having scored 0 in it (as a blank cell does);
 * without it, only players present in `rounds` get an entry.
 */
export function computeRoundsWon(
  rounds: PlayerScore[][],
  winCondition: WinCondition,
  participants: readonly string[] = [],
): Map<string, number> {
  const won = new Map<string, number>()
  for (const id of participants) won.set(id, 0)
  for (const stored of rounds) {
    if (stored.length === 0) continue
    const present = new Set(stored.map((ps) => ps.playerId))
    const round = [
      ...stored,
      ...participants.filter((id) => !present.has(id)).map((playerId) => ({ playerId, score: 0 })),
    ]
    for (const ps of round) if (!won.has(ps.playerId)) won.set(ps.playerId, 0)
    if (winCondition === 'MANUAL') continue
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
