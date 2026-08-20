import type { ObjectifCardSelection } from '../../../src/domain/model/landscape'
import type { Match, PlayerResult } from '../../../src/domain/model/match'
import type { Player } from '../../../src/domain/model/player'
import type { ToriiCounts } from '../../../src/domain/model/torii'

/**
 * Fixed sample data for the visual suite. Typed against the domain models on
 * purpose: if a persisted model gains a required field, `pnpm typecheck` fails
 * here rather than the screenshots silently drifting.
 *
 * Ids and timestamps are hardcoded — nothing here may derive from `Date.now()`
 * or a random generator, or the baselines would change on every run.
 */

export const PLAYERS: Player[] = [
  { id: 'player-akira', name: 'Akira', active: true },
  { id: 'player-mei', name: 'Mei', active: true },
  { id: 'player-hiroshi', name: 'Hiroshi', active: true },
]

/** A name long enough to catch a row that stops truncating and pushes the delete button off-screen. */
export const PLAYERS_WITH_LONG_NAME: Player[] = [
  ...PLAYERS,
  { id: 'player-long', name: 'Bartholomew Featherstonehaugh', active: true },
]

export const ALL_A_CARDS: ObjectifCardSelection = {
  bamboo: 'A',
  cherryBlossom: 'A',
  mountain: 'A',
  water: 'A',
  village: 'A',
}

export const MIXED_CARDS: ObjectifCardSelection = {
  bamboo: 'B',
  cherryBlossom: 'A',
  mountain: 'C',
  water: 'B',
  village: 'A',
}

function torii(green: number, red: number, blue: number, yellow: number, purple: number): ToriiCounts {
  return { green, red, blue, yellow, purple }
}

function result(
  playerId: string,
  toriiCounts: ToriiCounts,
  parcheminValue: PlayerResult['parcheminValue'],
  hasPinceau: boolean,
  objectifPoints: PlayerResult['objectifPoints'],
): PlayerResult {
  return { playerId, toriiCounts, parcheminValue, hasPinceau, objectifPoints }
}

/** 2024-03-15T12:00:00Z — pinned so History's rendered date never moves. */
const MATCH_ONE_PLAYED_AT = 1710504000000
/** 2024-04-02T12:00:00Z */
const MATCH_TWO_PLAYED_AT = 1712059200000

export const MATCHES: Match[] = [
  {
    id: 'match-one',
    playedAt: MATCH_ONE_PLAYED_AT,
    playerIds: ['player-akira', 'player-mei', 'player-hiroshi'],
    objectifCards: MIXED_CARDS,
    results: [
      result('player-akira', torii(2, 1, 1, 0, 0), 3, true, {
        bamboo: 4,
        cherryBlossom: 2,
        mountain: 0,
        water: 5,
        village: 1,
      }),
      result('player-mei', torii(1, 1, 1, 1, 1), 5, false, {
        bamboo: 0,
        cherryBlossom: 6,
        mountain: 3,
        water: 2,
        village: 4,
      }),
      result('player-hiroshi', torii(0, 2, 0, 1, 1), 0, false, {
        bamboo: 2,
        cherryBlossom: 1,
        mountain: 7,
        water: 0,
        village: 0,
      }),
    ],
  },
  {
    id: 'match-two',
    playedAt: MATCH_TWO_PLAYED_AT,
    playerIds: ['player-akira', 'player-mei'],
    objectifCards: ALL_A_CARDS,
    results: [
      result('player-akira', torii(1, 1, 0, 0, 0), 4, false, {
        bamboo: 1,
        cherryBlossom: 1,
        mountain: 1,
        water: 1,
        village: 1,
      }),
      result('player-mei', torii(1, 1, 0, 0, 0), 4, true, {
        bamboo: 1,
        cherryBlossom: 1,
        mountain: 1,
        water: 1,
        village: 1,
      }),
    ],
  },
]
