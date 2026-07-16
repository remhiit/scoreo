import { describe, expect, it } from 'vitest'
import type { SyncData } from '../../domain/port/cloudSyncRepository'
import { SyncUseCase } from '../../application/syncUseCase'
import { InMemoryCloudSyncRepository } from '../../infrastructure/testing/inMemoryCloudSyncRepository'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { submitLogin, submitLogout, submitResolveConflict, submitRestoreSession, syncReducer } from './syncReducer'
import { initialSyncState, type SyncState } from './syncTypes'
import type { SyncAction } from './syncReducer'

function buildUseCase(
  cloudRepo = new InMemoryCloudSyncRepository(),
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
) {
  return { cloudRepo, playerRepo, syncUseCase: new SyncUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo) }
}

async function runWithDispatch(
  fn: (dispatch: (action: SyncAction) => void) => Promise<void>,
): Promise<SyncState> {
  let state = initialSyncState
  const dispatch = (action: SyncAction) => {
    state = syncReducer(state, action)
  }
  await fn(dispatch)
  return state
}

describe('syncReducer', () => {
  it('initial state is Disconnected with no error', () => {
    expect(initialSyncState.phase).toBe('Disconnected')
    expect(initialSyncState.email).toBeNull()
    expect(initialSyncState.conflict).toBeUndefined()
    expect(initialSyncState.result).toBeUndefined()
    expect(initialSyncState.error).toBeUndefined()
  })

  it('login with empty data results in Resolved', async () => {
    const { syncUseCase } = buildUseCase()

    const state = await runWithDispatch((dispatch) => submitLogin(syncUseCase, dispatch))

    expect(state.phase).toBe('Resolved')
    expect(state.email).toBe('test@example.com')
    expect(state.result).toBeDefined()
    expect(state.error).toBeUndefined()
    expect(state.conflict).toBeUndefined()
  })

  it('login with conflicting remote data shows the Conflict phase', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    cloudRepo.storedData = {
      players: [{ id: 'p2', name: 'Bob', active: true }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    } satisfies SyncData

    const { syncUseCase } = buildUseCase(cloudRepo, playerRepo)
    const state = await runWithDispatch((dispatch) => submitLogin(syncUseCase, dispatch))

    expect(state.phase).toBe('Conflict')
    expect(state.email).toBe('test@example.com')
    expect(state.conflict).toBeDefined()
    expect(state.error).toBeUndefined()

    expect(state.conflict?.localSnapshot.playerCount).toBe(1)
    expect(state.conflict?.localSnapshot.matchCount).toBe(0)
    expect(state.conflict?.localSnapshot.gameTypeCount).toBe(0)

    expect(state.conflict?.remoteSnapshot.playerCount).toBe(1)
    expect(state.conflict?.remoteSnapshot.matchCount).toBe(0)
    expect(state.conflict?.remoteSnapshot.gameTypeCount).toBe(0)
  })

  it('logout resets state to Disconnected with empty fields', async () => {
    const { syncUseCase } = buildUseCase()
    let state = initialSyncState
    const dispatch = (action: SyncAction) => {
      state = syncReducer(state, action)
    }

    await submitLogin(syncUseCase, dispatch)
    expect(state.phase).toBe('Resolved')

    await submitLogout(syncUseCase, dispatch)

    expect(state.phase).toBe('Disconnected')
    expect(state.email).toBeNull()
    expect(state.conflict).toBeUndefined()
    expect(state.result).toBeUndefined()
    expect(state.error).toBeUndefined()
  })

  it('resolving a conflict keeping local transitions to Resolved with no conflict', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    cloudRepo.storedData = {
      players: [{ id: 'p2', name: 'Bob', active: true }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    }
    const { syncUseCase } = buildUseCase(cloudRepo, playerRepo)
    let state = initialSyncState
    const dispatch = (action: SyncAction) => {
      state = syncReducer(state, action)
    }

    await submitLogin(syncUseCase, dispatch)
    expect(state.phase).toBe('Conflict')

    await submitResolveConflict(syncUseCase, dispatch, true)

    expect(state.phase).toBe('Resolved')
    expect(state.conflict).toBeUndefined()
    expect(state.result).toBeDefined()
    expect(state.error).toBeUndefined()
    expect(state.result!.pushed).toBeGreaterThan(0)
  })

  it('resolving a conflict keeping remote transitions to Resolved with no conflict', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    cloudRepo.storedData = {
      players: [{ id: 'p2', name: 'Bob', active: true }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    }
    const { syncUseCase } = buildUseCase(cloudRepo, playerRepo)
    let state = initialSyncState
    const dispatch = (action: SyncAction) => {
      state = syncReducer(state, action)
    }

    await submitLogin(syncUseCase, dispatch)
    expect(state.phase).toBe('Conflict')

    await submitResolveConflict(syncUseCase, dispatch, false)

    expect(state.phase).toBe('Resolved')
    expect(state.conflict).toBeUndefined()
    expect(state.result).toBeDefined()
    expect(state.error).toBeUndefined()
    expect(state.result!.pulled).toBeGreaterThan(0)
  })

  it('dismissError clears the error field from state', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    cloudRepo.failNext = () => ({ kind: 'ApiError', code: 0, message: 'Network timeout' })
    const { syncUseCase } = buildUseCase(cloudRepo)
    let state = initialSyncState
    const dispatch = (action: SyncAction) => {
      state = syncReducer(state, action)
    }

    await submitLogin(syncUseCase, dispatch)

    expect(state.phase).toBe('Disconnected')
    expect(state.error).toBe('Network timeout')

    state = syncReducer(state, { type: 'dismissError' })

    expect(state.error).toBeUndefined()
    expect(state.phase).toBe('Disconnected')
    expect(state.email).toBe('test@example.com')
  })

  it('restoringSession sets phase to Restoring', () => {
    const state = syncReducer(initialSyncState, { type: 'restoringSession' })

    expect(state.phase).toBe('Restoring')
  })

  it('restoreFinished returns to the Disconnected phase', () => {
    const restoring = syncReducer(initialSyncState, { type: 'restoringSession' })

    const state = syncReducer(restoring, { type: 'restoreFinished' })

    expect(state.phase).toBe('Disconnected')
  })

  it('restoreSession phase is Restoring synchronously, never Disconnected, before it resolves', async () => {
    const { syncUseCase } = buildUseCase()
    let state = initialSyncState
    const dispatch = (action: SyncAction) => {
      state = syncReducer(state, action)
    }

    const pending = submitRestoreSession(syncUseCase, dispatch)

    expect(state.phase).toBe('Restoring')

    await pending
  })

  it('restoreSession does nothing when not connected', async () => {
    const { syncUseCase } = buildUseCase()

    const state = await runWithDispatch((dispatch) => submitRestoreSession(syncUseCase, dispatch))

    expect(state.phase).toBe('Disconnected')
    expect(state.email).toBeNull()
    expect(state.error).toBeUndefined()
  })

  it('restoreSession runs autoSync when already connected', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    cloudRepo.connected = true
    cloudRepo.email = 'restored@example.com'
    const { syncUseCase } = buildUseCase(cloudRepo)

    const state = await runWithDispatch((dispatch) => submitRestoreSession(syncUseCase, dispatch))

    expect(state.phase).toBe('Resolved')
    expect(state.email).toBe('restored@example.com')
    expect(state.result).toBeDefined()
    expect(state.error).toBeUndefined()
  })

  it('logout after login returns to the Disconnected phase', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    cloudRepo.storedData = {
      players: [{ id: 'p2', name: 'Bob', active: true }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    }
    const { syncUseCase } = buildUseCase(cloudRepo, playerRepo)
    let state = initialSyncState
    const dispatch = (action: SyncAction) => {
      state = syncReducer(state, action)
    }

    await submitLogin(syncUseCase, dispatch)
    expect(state.phase).toBe('Conflict')

    await submitLogout(syncUseCase, dispatch)

    expect(state.phase).toBe('Disconnected')
    expect(state.email).toBeNull()
    expect(state.conflict).toBeUndefined()
    expect(state.result).toBeUndefined()
    expect(state.error).toBeUndefined()
  })
})
