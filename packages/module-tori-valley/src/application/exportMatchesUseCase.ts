import type { Match } from '../domain/model/match'
import { toModuleMatchResult } from '../domain/model/moduleResult'
import type { Player } from '../domain/model/player'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import { toriValleyManifest } from '../module'

/** Scoreo's import contract version this export targets (`schemas/import/v1.1.json-schema`). */
export const EXPORT_VERSION = '1.1'

/**
 * Game name Scoreo will create on first import — the physical game's French
 * title. Taken from the manifest so the file export and the in-process binding
 * can never name the game differently.
 */
export const EXPORT_GAME_NAME = toriValleyManifest.gameNames[0]

/** Scoreo needs ≥2 entries in `ranking`, so solo matches can't be represented. */
export const MIN_EXPORTABLE_PLAYERS = 2

export interface ExportRankingEntry {
  name: string
  score: number
  rank: number
}

export interface ExportRoundScore {
  name: string
  score: number
}

export interface ExportRound {
  scores: ExportRoundScore[]
}

export interface ExportGame {
  id: string
  date: number
  ranking: ExportRankingEntry[]
  details: ExportRound[]
}

export interface ScoreoExport {
  version: string
  game: string
  exportedAt: number
  gameCount: number
  winCondition: 'HIGHEST_SCORE'
  games: ExportGame[]
}

export interface ExportMatchesResult {
  /**
   * The export payload. Callers must not offer it as a file when `games` is
   * empty: Scoreo's contract declares `games` with `minItems: 1`, so an empty
   * history — or one holding nothing but solo matches — has no valid file to
   * hand over, only a message to show.
   */
  payload: ScoreoExport
  /** Number of solo matches left out — Scoreo's `ranking` requires at least 2 players. */
  skippedSoloMatches: number
}

function shortId(playerId: string): string {
  return playerId.slice(0, 8)
}

/**
 * Scoreo resolves players by name (case-insensitively), so every player in the
 * file needs a distinct, non-blank one. Deleted-and-anonymized players have a
 * blank name, and nothing stops two Torī Valley players sharing a name — both
 * get disambiguated by an id prefix, which stays stable across re-exports so
 * Scoreo keeps matching them to the same player.
 */
function buildNameMap(players: Player[]): Map<string, string> {
  const nameCount = new Map<string, number>()
  for (const player of players) {
    const key = player.name.trim().toLowerCase()
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1)
  }
  const names = new Map<string, string>()
  for (const player of players) {
    const trimmed = player.name.trim()
    const isAmbiguous = (nameCount.get(trimmed.toLowerCase()) ?? 0) > 1
    if (trimmed.length === 0) names.set(player.id, `Unknown player (${shortId(player.id)})`)
    else if (isAmbiguous) names.set(player.id, `${trimmed} (${shortId(player.id)})`)
    else names.set(player.id, trimmed)
  }
  return names
}

/**
 * The file view of a finished match: the same ranking and the same category
 * breakdown the in-process module result carries, with player ids swapped for
 * the display names Scoreo resolves people by. The rank ordering and the
 * category order both come from `toModuleMatchResult`, so the file and the
 * module can never disagree about a score.
 *
 * Scoreo's file contract has no label on a round, so the category order is the
 * only thing carrying meaning there (rounds show up as "round 1..7").
 */
function buildGame(match: Match, nameOf: (playerId: string) => string): ExportGame {
  const result = toModuleMatchResult({ ...match, matchId: match.id })
  return {
    id: match.id,
    date: match.playedAt,
    ranking: result.ranking.map((entry) => ({
      name: nameOf(entry.playerId),
      score: entry.score,
      rank: entry.rank,
    })),
    details: (result.rounds ?? []).map((round) => ({
      scores: round.scores.map((score) => ({
        name: nameOf(score.playerId),
        score: score.score,
      })),
    })),
  }
}

/**
 * Turns the local match history into a file Scoreo can import
 * (`schemas/import/v1.1.json-schema` in the scoreo repo). Match ids are carried
 * over verbatim, which is what lets Scoreo skip matches already imported —
 * re-exporting everything is safe.
 */
export class ExportMatchesUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly currentDate: () => number,
  ) {}

  invoke(): ExportMatchesResult {
    const nameMap = buildNameMap(this.playerRepository.getAll(true))
    const nameOf = (playerId: string) =>
      nameMap.get(playerId) ?? `Unknown player (${shortId(playerId)})`

    const all = this.matchRepository.getAll()
    const exportable = all.filter((match) => match.results.length >= MIN_EXPORTABLE_PLAYERS)
    const games = [...exportable]
      .sort((a, b) => a.playedAt - b.playedAt)
      .map((match) => buildGame(match, nameOf))

    return {
      payload: {
        version: EXPORT_VERSION,
        game: EXPORT_GAME_NAME,
        exportedAt: this.currentDate(),
        gameCount: games.length,
        winCondition: 'HIGHEST_SCORE',
        games,
      },
      skippedSoloMatches: all.length - exportable.length,
    }
  }
}
