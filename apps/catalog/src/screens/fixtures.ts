import {
  BindModuleUseCase,
  createServices,
  InMemoryCloudSyncRepository,
  InMemoryGameTypeRepository,
  InMemoryMatchDraftRepository,
  InMemoryMatchRepository,
  InMemoryPlayerRepository,
  MODULE_MANIFESTS,
  newGameType,
  type GameType,
  type Match,
  type MatchDraft,
  type Player,
  type Services,
} from 'scoreo/catalog'

/**
 * The example data every screen of the catalog runs on: a group of friends who
 * play on Friday nights. In French, realistic, never lorem ipsum. Each frame
 * gets its own copy (`seededServices`), so what a viewer does in one never
 * shows up in another.
 */

/** 18 Nov 2026, 21:00 — "now" for every screen, so dates never move. */
export const NOW = new Date(2026, 10, 18, 21, 0).getTime()
const DAY = 24 * 60 * 60 * 1000

export const PLAYERS: Player[] = [
  { id: 'p-alice', name: 'Alice', active: true },
  { id: 'p-bruno', name: 'Bruno', active: true },
  { id: 'p-chloe', name: 'Chloé', active: true },
  { id: 'p-david', name: 'David', active: true },
  { id: 'p-emilie', name: 'Émilie', active: true },
  { id: 'p-farid', name: 'Farid', active: false },
]
const [ALICE, BRUNO, CHLOE, DAVID, EMILIE] = PLAYERS.map((p) => p.id)

export const TAROT = newGameType('g-tarot', 'Tarot', 'HIGHEST_SCORE')
export const UNO = newGameType('g-uno', 'Uno', 'LOWEST_SCORE')
export const BELOTE = newGameType('g-belote', 'Belote', 'HIGHEST_SCORE', {
  scoringMode: 'ROUNDS_WON',
})
export const PETANQUE = newGameType('g-petanque', 'Pétanque', 'MANUAL')
const YAMS = newGameType('g-yams', 'Yams', 'HIGHEST_SCORE', { active: false })
const GAME_TYPES: GameType[] = [TAROT, UNO, BELOTE, PETANQUE, YAMS]

/** A match from its rounds: totals are the sum of each player's rounds. */
function match(
  id: string,
  gameType: GameType,
  daysAgo: number,
  rounds: Record<string, number>[],
  manualWinners: string[] = [],
): Match {
  const playerIds = Object.keys(rounds[0])
  return {
    id,
    date: NOW - daysAgo * DAY - 2 * 60 * 60 * 1000,
    gameTypeId: gameType.id,
    playerScores: playerIds.map((playerId) => ({
      playerId,
      score: rounds.reduce((sum, round) => sum + (round[playerId] ?? 0), 0),
    })),
    manualWinners,
    secondaryPlayerScores: [],
    rounds: rounds.map((round) =>
      Object.entries(round).map(([playerId, score]) => ({ playerId, score })),
    ),
    moduleData: null,
  }
}

export const MATCHES: Match[] = [
  match('m-1', TAROT, 1, [
    { [ALICE]: 54, [BRUNO]: -18, [CHLOE]: -18, [DAVID]: -18 },
    { [ALICE]: -27, [BRUNO]: 81, [CHLOE]: -27, [DAVID]: -27 },
    { [ALICE]: 66, [BRUNO]: -22, [CHLOE]: -22, [DAVID]: -22 },
  ]),
  match('m-2', UNO, 1, [
    { [ALICE]: 12, [CHLOE]: 0, [EMILIE]: 34 },
    { [ALICE]: 0, [CHLOE]: 25, [EMILIE]: 8 },
    { [ALICE]: 7, [CHLOE]: 19, [EMILIE]: 0 },
  ]),
  match('m-3', BELOTE, 8, [
    { [BRUNO]: 162, [DAVID]: 0 },
    { [BRUNO]: 80, [DAVID]: 82 },
    { [BRUNO]: 101, [DAVID]: 61 },
  ]),
  match('m-4', TAROT, 8, [
    { [ALICE]: -24, [BRUNO]: -24, [CHLOE]: 72, [EMILIE]: -24 },
    { [ALICE]: 93, [BRUNO]: -31, [CHLOE]: -31, [EMILIE]: -31 },
  ]),
  match('m-5', PETANQUE, 15, [{ [CHLOE]: 13, [DAVID]: 9, [EMILIE]: 13 }], [CHLOE, EMILIE]),
  match('m-6', UNO, 22, [
    { [BRUNO]: 21, [DAVID]: 0, [EMILIE]: 14 },
    { [BRUNO]: 0, [DAVID]: 30, [EMILIE]: 9 },
  ]),
  match('m-7', TAROT, 29, [
    { [ALICE]: 40, [BRUNO]: -40, [CHLOE]: 40, [DAVID]: -40 },
    { [ALICE]: -51, [BRUNO]: 51, [CHLOE]: 51, [DAVID]: -51 },
  ]),
]

/** A Tarot game left half-entered: Home offers to resume it. */
export const TAROT_DRAFT: MatchDraft = {
  gameTypeId: TAROT.id,
  playerIds: [ALICE, BRUNO, CHLOE, DAVID],
  rounds: [{ [ALICE]: '54', [BRUNO]: '-18', [CHLOE]: '-18', [DAVID]: '-18' }],
  updatedAt: NOW - 30 * 60 * 1000,
  moduleState: null,
}

export interface Seed {
  /** Players, games and matches above; `false` is a first launch. */
  history?: boolean
  /** A game to resume, shown on Home. */
  draft?: MatchDraft
  /** `connected` signs the viewer into a fake Google Drive, synced an hour ago. */
  sync?: 'signed-out' | 'connected'
}

/** A fresh services bag over in-memory repositories, seeded as asked. */
export function seededServices({
  history = true,
  draft,
  sync = 'signed-out',
}: Seed = {}): Services {
  const playerRepository = new InMemoryPlayerRepository()
  const gameTypeRepository = new InMemoryGameTypeRepository()
  const matchRepository = new InMemoryMatchRepository()
  const matchDraftRepository = new InMemoryMatchDraftRepository()
  const cloudSyncRepository = new InMemoryCloudSyncRepository()
  if (sync === 'connected') {
    cloudSyncRepository.connected = true
    cloudSyncRepository.setLastSync(NOW - 60 * 60 * 1000)
  }
  if (history) {
    PLAYERS.forEach((player) => playerRepository.save(player))
    GAME_TYPES.forEach((gameType) => gameTypeRepository.save(gameType))
    matchRepository.saveAll(MATCHES)
  }
  if (draft) matchDraftRepository.save(draft)
  return createServices({
    playerRepository,
    gameTypeRepository,
    matchRepository,
    matchDraftRepository,
    cloudSyncRepository,
    currentDate: () => NOW,
  })
}

/**
 * Binds a module's game the way the app does when someone first picks it, and
 * returns the game's id — the route of the module's screen needs it.
 */
export function bindModule(services: Services, moduleId: string): string {
  const manifest = MODULE_MANIFESTS.find((m) => m.moduleId === moduleId)
  if (!manifest) throw new Error(`No module "${moduleId}" in the registry`)
  return new BindModuleUseCase(services.gameTypeRepository, services.matchRepository).invoke(
    manifest,
  ).id
}
