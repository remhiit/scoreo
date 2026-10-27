// See `./player`: this model is shared with every scoring module, so it lives in
// `@scoreboards/shared-domain`, unchanged — the bytes it parses are already on
// users' devices.
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
} from '@scoreboards/shared-domain'
