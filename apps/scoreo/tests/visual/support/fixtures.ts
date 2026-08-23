import type { GameType } from '../../../src/domain/model/gameType'
import type { Match } from '../../../src/domain/model/match'
import type { Player } from '../../../src/domain/model/player'

/**
 * Fixed sample data for the visual suite.
 *
 * Ids and timestamps are hardcoded — nothing here may derive from `Date.now()`
 * or a random generator, or the baselines would change on every run.
 */

export const PLAYERS: Player[] = [
  { id: 'player-akira', name: 'Akira', active: true },
  { id: 'player-mei', name: 'Mei', active: true },
  { id: 'player-hiroshi', name: 'Hiroshi', active: true },
]

export const PLAYER_IDS = PLAYERS.map((player) => player.id)

/** Shaped exactly as `BindModuleUseCase` creates it from the module's manifest. */
export const TORI_GAME_TYPE: GameType = {
  id: 'gametype-tori',
  name: 'La Vallée des Torī',
  winCondition: 'HIGHEST_SCORE',
  tieBreakRule: 'NONE',
  tieBreakCondition: 'HIGHEST_SCORE',
  tieBreakLabel: null,
  moduleId: 'tori-valley',
  active: true,
}

/**
 * The module's own payload, written here as the opaque blob it is.
 *
 * Scoreo stores `moduleData` verbatim and never looks inside, so the visual
 * suite has no business typing it either — the module's Vitest suite is what
 * holds its shape. If the payload ever drifts, the module reopens on an empty
 * grid and these baselines fail loudly, which is the point.
 */
const MATCH_ONE_MODULE_DATA = {
  objectifCards: {
    bamboo: 'B',
    cherryBlossom: 'A',
    mountain: 'C',
    water: 'B',
    village: 'A',
  },
  results: [
    {
      playerId: 'player-akira',
      toriiCounts: { green: 2, red: 1, blue: 1, yellow: 0, purple: 0 },
      parcheminValue: 3,
      hasPinceau: true,
      objectifPoints: { bamboo: 4, cherryBlossom: 2, mountain: 0, water: 5, village: 1 },
    },
    {
      playerId: 'player-mei',
      toriiCounts: { green: 1, red: 1, blue: 1, yellow: 1, purple: 1 },
      parcheminValue: 5,
      hasPinceau: false,
      objectifPoints: { bamboo: 0, cherryBlossom: 6, mountain: 3, water: 2, village: 4 },
    },
    {
      playerId: 'player-hiroshi',
      toriiCounts: { green: 0, red: 2, blue: 0, yellow: 1, purple: 1 },
      parcheminValue: 0,
      hasPinceau: false,
      objectifPoints: { bamboo: 2, cherryBlossom: 1, mountain: 7, water: 0, village: 0 },
    },
  ],
}

/** 2024-03-15T12:00:00Z — pinned so any rendered date stays put. */
const MATCH_ONE_DATE = 1710504000000

/**
 * A real UUID v4, not a readable slug: `migrateMatches` rewrites any match id
 * that is not one on the first read, and a renamed match is a match the module
 * route can no longer find.
 */
export const MATCH_ONE_ID = '3f1c8a52-6d94-4b1e-9c07-2a5e8d431f60'

/**
 * One finished match, exactly as the module hands it back through
 * `host.saveMatch`: a ranking score per player, the per-category pseudo-rounds
 * that sum back to it, and the module's grid in `moduleData`.
 */
export const MATCHES: Match[] = [
  {
    id: MATCH_ONE_ID,
    date: MATCH_ONE_DATE,
    gameTypeId: TORI_GAME_TYPE.id,
    playerScores: [
      { playerId: 'player-akira', score: 21 },
      { playerId: 'player-mei', score: 30 },
      { playerId: 'player-hiroshi', score: 14 },
    ],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [
      // bamboo, cherryBlossom, mountain, water, village, torii, parchemin(+pinceau)
      [
        { playerId: 'player-akira', score: 4 },
        { playerId: 'player-mei', score: 0 },
        { playerId: 'player-hiroshi', score: 2 },
      ],
      [
        { playerId: 'player-akira', score: 2 },
        { playerId: 'player-mei', score: 6 },
        { playerId: 'player-hiroshi', score: 1 },
      ],
      [
        { playerId: 'player-akira', score: 0 },
        { playerId: 'player-mei', score: 3 },
        { playerId: 'player-hiroshi', score: 7 },
      ],
      [
        { playerId: 'player-akira', score: 5 },
        { playerId: 'player-mei', score: 2 },
        { playerId: 'player-hiroshi', score: 0 },
      ],
      [
        { playerId: 'player-akira', score: 1 },
        { playerId: 'player-mei', score: 4 },
        { playerId: 'player-hiroshi', score: 0 },
      ],
      [
        { playerId: 'player-akira', score: 4 },
        { playerId: 'player-mei', score: 10 },
        { playerId: 'player-hiroshi', score: 4 },
      ],
      [
        { playerId: 'player-akira', score: 5 },
        { playerId: 'player-mei', score: 5 },
        { playerId: 'player-hiroshi', score: 0 },
      ],
    ],
    moduleData: {
      moduleId: 'tori-valley',
      version: 1,
      data: MATCH_ONE_MODULE_DATA,
    },
  },
]
