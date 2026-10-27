// See `./player`: this model is shared with every scoring module, so it lives in
// `@scoreboards/shared-domain`, unchanged — the bytes it parses are already on
// users' devices.
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
} from '@scoreboards/shared-domain'
