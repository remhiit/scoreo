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


// ─────────────────────────── 1000 Sabords ───────────────────────────

/** Shaped exactly as `BindModuleUseCase` creates it from the module's manifest. */
export const SABORDS_GAME_TYPE: GameType = {
  id: 'gametype-sabords',
  name: '1000 Sabords',
  winCondition: 'HIGHEST_SCORE',
  tieBreakRule: 'NONE',
  tieBreakCondition: 'HIGHEST_SCORE',
  tieBreakLabel: null,
  moduleId: 'mille-sabords',
  active: true,
}

/**
 * A hand-entered move, which is all these baselines need: the calculator path
 * produces the same `EvenementCoup`, and a dice-by-dice fixture would pin the
 * scoring rules to a screenshot instead of to the golden test that owns them.
 */
function coupManuel(playerId: string, score: number) {
  return { type: 'manuel', joueur: playerId, scoreEntre: score, multiplicateur: 1, score }
}

/**
 * Four moves: a full round, then Akira opens the second. Nobody is near the
 * 6000 threshold, so the module renders its playing screen with a populated
 * scoreboard — and Mei on turn.
 */
const SABORDS_IN_PROGRESS = [
  coupManuel('player-akira', 2000),
  coupManuel('player-mei', 1500),
  coupManuel('player-hiroshi', 1000),
  coupManuel('player-akira', 2500),
]

/**
 * Nine moves, three full rounds. Akira crosses 6000 on the seventh, which arms
 * the last turn; the round then completes, so the module renders its **end**
 * screen — final standings, Akira 6500, Mei 5800, Hiroshi 4500.
 */
const SABORDS_FINISHED = [
  ...SABORDS_IN_PROGRESS.slice(0, 3),
  coupManuel('player-akira', 2500),
  coupManuel('player-mei', 2000),
  coupManuel('player-hiroshi', 1500),
  coupManuel('player-akira', 2000),
  coupManuel('player-mei', 2300),
  coupManuel('player-hiroshi', 2000),
]

/** Real UUIDs — see MATCH_ONE_ID for why a readable slug would not survive. */
export const SABORDS_IN_PROGRESS_ID = '7b2e19c4-0d53-4f88-a1b6-c95e274308da'
export const SABORDS_FINISHED_ID = 'c48d6a01-9f27-4e35-b0d2-16ae5b8c93f7'

/** 2024-05-04T12:00:00Z and 2024-05-11T12:00:00Z. */
const SABORDS_DATES = [1714824000000, 1715428800000]

function sabordsMatch(id: string, date: number, historique: unknown[], scores: number[]): Match {
  return {
    id,
    date,
    gameTypeId: SABORDS_GAME_TYPE.id,
    playerScores: PLAYER_IDS.map((playerId, index) => ({ playerId, score: scores[index] })),
    manualWinners: [],
    secondaryPlayerScores: [],
    // Left empty on purpose: these baselines never open Scoreo's own history,
    // and the module rebuilds its rounds from the event log anyway.
    rounds: [],
    moduleData: {
      moduleId: 'mille-sabords',
      version: 1,
      data: { joueurs: PLAYER_IDS, historique },
    },
  }
}

export const SABORDS_MATCHES: Match[] = [
  sabordsMatch(SABORDS_IN_PROGRESS_ID, SABORDS_DATES[0], SABORDS_IN_PROGRESS, [4500, 1500, 1000]),
  sabordsMatch(SABORDS_FINISHED_ID, SABORDS_DATES[1], SABORDS_FINISHED, [6500, 5800, 4500]),
]
