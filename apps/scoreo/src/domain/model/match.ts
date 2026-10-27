// See `./player`: this model is shared with every scoring module, so it lives in
// `@scoreboards/shared-domain`, unchanged — the bytes it parses are already on
// users' devices.
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
} from '@scoreboards/shared-domain'
