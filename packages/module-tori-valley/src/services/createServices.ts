import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import { LocalStorageMatchRepository } from '../infrastructure/localStorage/localStorageMatchRepository'
import { LocalStoragePlayerRepository } from '../infrastructure/localStorage/localStoragePlayerRepository'

/** Repositories shared across screens, built once at app root. */
export interface Services {
  playerRepository: PlayerRepository
  matchRepository: MatchRepository
  currentDate: () => number
}

export interface CreateServicesOptions {
  playerRepository?: PlayerRepository
  matchRepository?: MatchRepository
  currentDate?: () => number
}

export function createServices(options: CreateServicesOptions = {}): Services {
  return {
    playerRepository: options.playerRepository ?? new LocalStoragePlayerRepository(),
    matchRepository: options.matchRepository ?? new LocalStorageMatchRepository(),
    currentDate: options.currentDate ?? (() => Date.now()),
  }
}
