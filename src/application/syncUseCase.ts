import type {
  CloudSyncRepository,
  SyncData,
  SyncStatus,
} from '../domain/port/cloudSyncRepository'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'

export interface SyncSnapshot {
  playerCount: number
  matchCount: number
  gameTypeCount: number
  lastModified: number
  dateLabel: string | null
}

export interface SyncConflict {
  localSnapshot: SyncSnapshot
  remoteSnapshot: SyncSnapshot
}

export interface SyncResult {
  pushed: number
  pulled: number
  timestamp: number
}

export type SyncOutcome = { kind: 'Synced'; result: SyncResult } | { kind: 'Conflict'; conflict: SyncConflict }

function now(): number {
  return Date.now()
}

function formatDate(epochMs: number): string | null {
  if (epochMs <= 0) return null
  try {
    const date = new Date(epochMs)
    const day = date.getDate()
    const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  } catch {
    return null
  }
}

function sortedById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Structural equality independent of object key order, matching Kotlin data class `==`.
 * Plain `JSON.stringify` comparison is key-order-sensitive, which would report a false
 * Conflict for objects that are semantically identical but serialized in a different
 * field order (e.g. after a round-trip through a real network adapter's JSON parsing).
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function isSameState(a: SyncData, b: SyncData): boolean {
  return (
    stableStringify(sortedById(a.players)) === stableStringify(sortedById(b.players)) &&
    stableStringify(sortedById(a.gameTypes)) === stableStringify(sortedById(b.gameTypes)) &&
    stableStringify(sortedById(a.matches)) === stableStringify(sortedById(b.matches))
  )
}

function toSnapshot(data: SyncData): SyncSnapshot {
  return {
    playerCount: data.players.length,
    matchCount: data.matches.length,
    gameTypeCount: data.gameTypes.length,
    lastModified: data.lastModified,
    dateLabel: formatDate(data.lastModified),
  }
}

export class SyncUseCase {
  constructor(
    private readonly cloudRepo: CloudSyncRepository,
    private readonly playerRepo: PlayerRepository,
    private readonly gameTypeRepo: GameTypeRepository,
    private readonly matchRepo: MatchRepository,
  ) {}

  async autoSync(): Promise<SyncOutcome> {
    const localData = this.buildLocalSyncData()
    const remoteData = await this.cloudRepo.pull()

    const localEmpty = localData.players.length === 0 && localData.gameTypes.length === 0 && localData.matches.length === 0
    const remoteEmpty = remoteData.players.length === 0 && remoteData.gameTypes.length === 0 && remoteData.matches.length === 0

    if (localEmpty && remoteEmpty) {
      return { kind: 'Synced', result: { pushed: 0, pulled: 0, timestamp: now() } }
    }
    if (remoteEmpty) {
      await this.cloudRepo.push(localData)
      return {
        kind: 'Synced',
        result: {
          pushed: localData.players.length + localData.gameTypes.length + localData.matches.length,
          pulled: 0,
          timestamp: now(),
        },
      }
    }
    if (localEmpty) {
      this.writeRemoteToLocal(remoteData)
      return {
        kind: 'Synced',
        result: {
          pushed: 0,
          pulled: remoteData.players.length + remoteData.gameTypes.length + remoteData.matches.length,
          timestamp: now(),
        },
      }
    }
    if (isSameState(localData, remoteData)) {
      return { kind: 'Synced', result: { pushed: 0, pulled: 0, timestamp: now() } }
    }
    return {
      kind: 'Conflict',
      conflict: { localSnapshot: toSnapshot(localData), remoteSnapshot: toSnapshot(remoteData) },
    }
  }

  async resolveConflict(keepLocal: boolean): Promise<SyncResult> {
    if (keepLocal) {
      const localData = this.buildLocalSyncData()
      await this.cloudRepo.push(localData)
      return {
        pushed: localData.players.length + localData.gameTypes.length + localData.matches.length,
        pulled: 0,
        timestamp: now(),
      }
    }
    const remoteData = await this.cloudRepo.pull()
    this.writeRemoteToLocal(remoteData)
    return {
      pushed: 0,
      pulled: remoteData.players.length + remoteData.gameTypes.length + remoteData.matches.length,
      timestamp: now(),
    }
  }

  async login(): Promise<void> {
    await this.cloudRepo.login()
  }

  async logout(): Promise<void> {
    await this.cloudRepo.logout()
  }

  async status(): Promise<SyncStatus> {
    return this.cloudRepo.getStatus()
  }

  private buildLocalSyncData(): SyncData {
    return {
      players: this.playerRepo.getAll(true),
      gameTypes: this.gameTypeRepo.getAll(),
      matches: this.matchRepo.getAll(),
      lastModified: now(),
    }
  }

  private writeRemoteToLocal(data: SyncData): void {
    const localPlayers = this.playerRepo.getAll(true)
    const localGameTypes = this.gameTypeRepo.getAll(true)
    const localMatches = this.matchRepo.getAll()
    try {
      this.playerRepo.deleteAll()
      this.gameTypeRepo.deleteAll()
      this.matchRepo.deleteAll()
      this.playerRepo.saveAll(data.players)
      this.gameTypeRepo.saveAll(data.gameTypes)
      this.matchRepo.saveAll(data.matches)
    } catch (error) {
      this.playerRepo.deleteAll()
      this.gameTypeRepo.deleteAll()
      this.matchRepo.deleteAll()
      this.playerRepo.saveAll(localPlayers)
      this.gameTypeRepo.saveAll(localGameTypes)
      this.matchRepo.saveAll(localMatches)
      throw error
    }
  }
}
