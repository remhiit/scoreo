import { WinConditionSchema, type WinCondition } from '../domain/model/enums'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import type { Player } from '../domain/model/player'
import type { PlayerScore } from '../domain/model/playerScore'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import { err, ok, type Result } from '../domain/result'
import { newId } from './idGenerator'

export interface SemanticVersion {
  major: number
  minor: number
}

/** Matches Kotlin's `String.toIntOrNull()`: digits only (optional leading minus), no ".", "e", or empty string. */
function parseIntOrNull(s: string): number | null {
  return /^-?\d+$/.test(s) ? Number(s) : null
}

function parseSemanticVersion(s: string): SemanticVersion {
  const parts = s.split('.')
  if (parts.length !== 2) throw new Error(`Invalid version format: ${s} (expected major.minor)`)
  const major = parseIntOrNull(parts[0])
  const minor = parseIntOrNull(parts[1])
  if (major === null) throw new Error(`Invalid major version: ${s}`)
  if (minor === null) throw new Error(`Invalid minor version: ${s}`)
  return { major, minor }
}

export const ImportVersions = {
  CURRENT: { major: 1, minor: 1 } as SemanticVersion,
}

export interface ImportResult {
  imported: number
  skipped: string[]
  failed: string[]
}

export interface ImportPreview {
  gameName: string
  count: number
}

interface ImportRankingEntry {
  name: string
  score: number
  rank: number
}

interface ImportRoundScore {
  name: string
  score: number
}

interface ImportRound {
  scores: ImportRoundScore[]
}

interface ImportGame {
  id: string
  date: number | null
  ranking: ImportRankingEntry[]
  details: ImportRound[] | null
}

interface ImportRoot {
  version: SemanticVersion
  game: string
  games: ImportGame[]
  winCondition: string | null
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected an object for ${context}`)
  }
  return value as Record<string, unknown>
}

/**
 * Kotlin reads these fields via `(obj["x"] as? JsonPrimitive)?.content?.toIntOrNull()`,
 * which parses the primitive's raw text regardless of whether the source JSON quoted it
 * as a string — so legacy exports with quoted numbers ("score": "10") import fine there.
 * Mirror that leniency here instead of requiring `typeof === 'number'`.
 */
function parseIntLike(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return null
}

function asArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Expected an array for ${context}`)
  return value
}

const WIN_CONDITIONS: readonly WinCondition[] = WinConditionSchema.options

export class ImportMatchesUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly matchRepository: MatchRepository,
    private readonly currentDate: () => number,
  ) {}

  preview(jsonString: string): Result<ImportPreview, Error> {
    try {
      const root = this.parseRoot(jsonString)
      return ok({ gameName: root.game, count: root.games.length })
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  execute(jsonString: string): Result<ImportResult, Error> {
    try {
      const root = this.parseRoot(jsonString)
      const gameType = this.resolveGameType(root.game, root.winCondition)
      const existingPlayers = [...this.playerRepository.getAll()]
      let imported = 0
      const skipped: string[] = []
      const failed: string[] = []

      for (const game of root.games) {
        if (this.matchRepository.findById(game.id)) {
          skipped.push(game.id)
          continue
        }

        const playerIds: string[] = []
        const scores: PlayerScore[] = []
        const rankingMap = new Map<string, number>()

        for (const entry of game.ranking) {
          const player = this.resolvePlayer(entry.name, existingPlayers)
          playerIds.push(player.id)
          scores.push({ playerId: player.id, score: entry.score })
          rankingMap.set(player.id, entry.rank)
        }

        if (game.details) {
          const playerNameMap = new Map(existingPlayers.map((p) => [p.id, p.name]))
          let valid = true
          for (const playerId of playerIds) {
            const expected = scores.find((s) => s.playerId === playerId)?.score ?? 0
            const playerName = playerNameMap.get(playerId) ?? playerId
            const actual = game.details.reduce((sum, round) => {
              const found = round.scores.find((s) => s.name === playerName)
              return sum + (found?.score ?? 0)
            }, 0)
            if (expected !== actual) {
              failed.push(game.id)
              valid = false
              break
            }
          }
          if (!valid) continue
        }

        const manualWinners = scores.filter((s) => rankingMap.get(s.playerId) === 1).map((s) => s.playerId)

        const match: Match = {
          id: game.id,
          date: game.date ?? this.currentDate(),
          gameTypeId: gameType.id,
          playerScores: scores,
          manualWinners,
          secondaryPlayerScores: [],
        }
        this.matchRepository.save(match)
        imported++
      }

      return ok({ imported, skipped, failed })
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  private parseRoot(jsonString: string): ImportRoot {
    const parsed: unknown = JSON.parse(jsonString)
    const element = asRecord(parsed, 'import root')
    const rawVersion = element.version
    if (typeof rawVersion !== 'string') throw new Error("Missing 'version' field")
    const version = parseSemanticVersion(rawVersion)
    if (version.major === 1) return this.parseV1(element, version)
    throw new Error(`Unsupported version ${rawVersion}, expected ${ImportVersions.CURRENT.major}.x`)
  }

  private parseV1(element: Record<string, unknown>, version: SemanticVersion): ImportRoot {
    const game = element.game
    if (typeof game !== 'string') throw new Error("Missing 'game' field")
    const gamesRaw = asArray(element.games, "'games' array")
    if (gamesRaw.length === 0) throw new Error("'games' array is empty")
    const winCondition = typeof element.winCondition === 'string' ? element.winCondition : null
    return {
      game,
      games: gamesRaw.map((g) => this.parseGame(g)),
      version,
      winCondition,
    }
  }

  private parseGame(raw: unknown): ImportGame {
    const obj = asRecord(raw, 'game')
    const id = obj.id
    if (typeof id !== 'string') throw new Error("Missing game 'id'")
    const date = parseIntLike(obj.date)
    const rankingRaw = asArray(obj.ranking, `'ranking' in game ${id}`)
    if (rankingRaw.length < 2) throw new Error(`'ranking' must have at least 2 entries in game ${id}`)
    const details = Array.isArray(obj.details) ? obj.details.map((r) => this.parseRound(r)) : null
    return {
      id,
      date,
      ranking: rankingRaw.map((r) => this.parseRankingEntry(r)),
      details,
    }
  }

  private parseRankingEntry(raw: unknown): ImportRankingEntry {
    const obj = asRecord(raw, 'ranking entry')
    const name = obj.name
    if (typeof name !== 'string') throw new Error("Missing 'name' in ranking")
    const score = parseIntLike(obj.score)
    if (score === null) throw new Error(`Invalid 'score' in ranking for ${name}`)
    const rank = parseIntLike(obj.rank)
    if (rank === null) throw new Error(`Invalid 'rank' in ranking for ${name}`)
    return { name, score, rank }
  }

  private parseRound(raw: unknown): ImportRound {
    const obj = asRecord(raw, 'round')
    const scores = asArray(obj.scores, "'scores' in round")
    return { scores: scores.map((s) => this.parseRoundScore(s)) }
  }

  private parseRoundScore(raw: unknown): ImportRoundScore {
    const obj = asRecord(raw, 'round score')
    const name = obj.name
    if (typeof name !== 'string') throw new Error("Missing 'name' in round score")
    const score = parseIntLike(obj.score)
    if (score === null) throw new Error(`Invalid 'score' in round for ${name}`)
    return { name, score }
  }

  private resolveGameType(name: string, winCondition: string | null): GameType {
    const existing = this.gameTypeRepository.getAll().find((gt) => gt.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing
    let wc: WinCondition = 'MANUAL'
    if (winCondition) {
      const found = WIN_CONDITIONS.find((c) => c.toLowerCase() === winCondition.toLowerCase())
      if (!found) {
        throw new Error(`Unknown winCondition '${winCondition}'. Valid values: ${WIN_CONDITIONS.join(', ')}`)
      }
      wc = found
    }
    const gameType: GameType = {
      id: newId(),
      name,
      winCondition: wc,
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    }
    this.gameTypeRepository.save(gameType)
    return gameType
  }

  private resolvePlayer(name: string, existingPlayers: Player[]): Player {
    const existing = existingPlayers.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing
    const player: Player = { id: newId(), name, active: true }
    existingPlayers.push(player)
    this.playerRepository.save(player)
    return player
  }
}
