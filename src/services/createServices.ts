import { SyncUseCase } from '../application/syncUseCase'
import type { CloudSyncRepository } from '../domain/port/cloudSyncRepository'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchDraftRepository } from '../domain/port/matchDraftRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import { GoogleAuthService } from '../infrastructure/google/googleAuthService'
import { GoogleDriveSyncAdapter } from '../infrastructure/google/googleDriveSyncAdapter'
import { OAUTH_CLIENT_ID } from '../infrastructure/google/oauthConfig'
import { LocalStorageGameTypeRepository } from '../infrastructure/localStorage/localStorageGameTypeRepository'
import { LocalStorageMatchDraftRepository } from '../infrastructure/localStorage/localStorageMatchDraftRepository'
import { LocalStorageMatchRepository } from '../infrastructure/localStorage/localStorageMatchRepository'
import { LocalStoragePlayerRepository } from '../infrastructure/localStorage/localStoragePlayerRepository'

/**
 * Repositories + use cases shared across screens, built once at app root.
 * Equivalent of Kotlin's `createAppDependencies` bag — minus the per-screen
 * Handlers, since screens are React components with their own `useReducer`
 * (TS-050+) and construct their own use cases from these repositories directly.
 */
export interface Services {
  playerRepository: PlayerRepository
  gameTypeRepository: GameTypeRepository
  matchRepository: MatchRepository
  matchDraftRepository: MatchDraftRepository
  /** undefined when no Google OAuth client id is configured (equivalent of Kotlin's null CloudSyncRepository). */
  cloudSyncRepository: CloudSyncRepository | undefined
  /** undefined whenever cloudSyncRepository is, mirroring createSyncHandlerIfAvailable returning null. */
  syncUseCase: SyncUseCase | undefined
  currentDate: () => number
}

export interface CreateServicesOptions {
  playerRepository?: PlayerRepository
  gameTypeRepository?: GameTypeRepository
  matchRepository?: MatchRepository
  matchDraftRepository?: MatchDraftRepository
  cloudSyncRepository?: CloudSyncRepository
  currentDate?: () => number
}

function createDefaultCloudSyncRepository(): CloudSyncRepository | undefined {
  if (!OAUTH_CLIENT_ID) return undefined
  return new GoogleDriveSyncAdapter(new GoogleAuthService(), OAUTH_CLIENT_ID)
}

export function createServices(options: CreateServicesOptions = {}): Services {
  const playerRepository = options.playerRepository ?? new LocalStoragePlayerRepository()
  const gameTypeRepository = options.gameTypeRepository ?? new LocalStorageGameTypeRepository()
  const matchRepository = options.matchRepository ?? new LocalStorageMatchRepository()
  const matchDraftRepository = options.matchDraftRepository ?? new LocalStorageMatchDraftRepository()
  const currentDate = options.currentDate ?? (() => Date.now())
  const cloudSyncRepository = options.cloudSyncRepository ?? createDefaultCloudSyncRepository()

  const syncUseCase = cloudSyncRepository
    ? new SyncUseCase(cloudSyncRepository, playerRepository, gameTypeRepository, matchRepository)
    : undefined

  return {
    playerRepository,
    gameTypeRepository,
    matchRepository,
    matchDraftRepository,
    cloudSyncRepository,
    syncUseCase,
    currentDate,
  }
}
