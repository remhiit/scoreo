export type { Player } from './player'
export { PlayerSchema } from './player.schema'
export { isUuid, newId } from './idGenerator'
export { err, ok, type Result } from './result'
export {
  ScoringModeSchema,
  TieBreakRuleSchema,
  WinConditionSchema,
  scoringModeLabel,
  tieBreakRuleLabel,
  winConditionLabel,
  type ScoringMode,
  type TieBreakRule,
  type WinCondition,
} from './enums'
export type { PlayerScore } from './playerScore'
export { PlayerScoreSchema } from './playerScore.schema'
export {
  computeRoundsWon,
  computeWinners,
  effectiveScoringMode,
  newGameType,
  roundScoringChanged,
  scoringModeIsSelectable,
  usesRoundsWon,
  type GameType,
  type GameTypeDefaults,
  type ScoringModeInputs,
} from './gameType'
export { GameTypeSchema } from './gameType.schema'
export {
  getWinners,
  isTieBreakIndeterminate,
  rescoreMatch,
  roundDetailStatus,
  scoresFromRounds,
  syntheticRounds,
  type Match,
  type MatchModuleData,
  type RoundDetailStatus,
} from './match'
export { MatchModuleDataSchema, MatchSchema } from './match.schema'
