import type { SyncConflict, SyncResult, SyncUseCase } from '../../application/syncUseCase'
import i18n from '../../i18n/i18n'
import { initialSyncState, type SyncState } from './syncTypes'

export type SyncAction =
  | { type: 'restoringSession' }
  | { type: 'restoreFinished' }
  | { type: 'loginStarted' }
  | { type: 'loginFailed'; error: string }
  | { type: 'connected' }
  | { type: 'synced'; result: SyncResult }
  | { type: 'conflictDetected'; conflict: SyncConflict }
  | { type: 'syncFailed'; error: string }
  | { type: 'loggedOut' }
  | { type: 'resolvingConflict' }
  | { type: 'conflictResolved'; result: SyncResult }
  | { type: 'conflictResolveFailed'; error: string }
  | { type: 'dismissError' }

export function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'restoringSession':
      return { ...state, phase: 'Restoring', error: undefined }
    case 'restoreFinished':
      return { ...state, phase: 'Disconnected', connected: false }
    case 'loginStarted':
      return { ...state, phase: 'Connecting', error: undefined }
    case 'loginFailed':
      return { ...state, phase: 'Disconnected', connected: false, error: action.error }
    case 'connected':
      return { ...state, phase: 'Detecting', connected: true }
    case 'synced':
      return { ...state, phase: 'Resolved', result: action.result }
    case 'conflictDetected':
      return { ...state, phase: 'Conflict', conflict: action.conflict }
    case 'syncFailed':
      return { ...state, phase: 'Disconnected', error: action.error }
    case 'loggedOut':
      return initialSyncState
    case 'resolvingConflict':
      return { ...state, phase: 'Syncing' }
    case 'conflictResolved':
      return { ...state, phase: 'Resolved', result: action.result, conflict: undefined }
    case 'conflictResolveFailed':
      return { ...state, phase: 'Conflict', error: action.error }
    case 'dismissError':
      return { ...state, error: undefined }
  }
}

/**
 * Extracts a message the same way Kotlin's `e.message` does for `SyncException`:
 * only `NotAuthenticated`/`ApiError` carry one, `NetworkError`/`Conflict`/`RateLimited`
 * don't override it (null in Kotlin) — callers apply their own fallback string,
 * mirroring each call site's `e.message ?: "..."`.
 */
function errorMessage(e: unknown): string | undefined {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return undefined
}

async function runAutoSync(syncUseCase: SyncUseCase, dispatch: (action: SyncAction) => void): Promise<void> {
  try {
    const outcome = await syncUseCase.autoSync()
    if (outcome.kind === 'Synced') {
      dispatch({ type: 'synced', result: outcome.result })
    } else {
      dispatch({ type: 'conflictDetected', conflict: outcome.conflict })
    }
  } catch (e) {
    dispatch({ type: 'syncFailed', error: errorMessage(e) ?? i18n.t('sync.syncFailed') })
  }
}

/** Mirrors SyncHandler's RestoreSession: silently stays disconnected if not connected or on error. */
export async function submitRestoreSession(
  syncUseCase: SyncUseCase,
  dispatch: (action: SyncAction) => void,
): Promise<void> {
  dispatch({ type: 'restoringSession' })
  try {
    const status = await syncUseCase.status()
    if (status.connected) {
      dispatch({ type: 'connected' })
      await runAutoSync(syncUseCase, dispatch)
    } else {
      dispatch({ type: 'restoreFinished' })
    }
  } catch {
    // Invalid or missing token — stay disconnected.
    dispatch({ type: 'restoreFinished' })
  }
}

export async function submitLogin(syncUseCase: SyncUseCase, dispatch: (action: SyncAction) => void): Promise<void> {
  dispatch({ type: 'loginStarted' })
  try {
    await syncUseCase.login()
    dispatch({ type: 'connected' })
    await runAutoSync(syncUseCase, dispatch)
  } catch (e) {
    dispatch({ type: 'loginFailed', error: errorMessage(e) ?? i18n.t('sync.loginFailed') })
  }
}

export async function submitLogout(syncUseCase: SyncUseCase, dispatch: (action: SyncAction) => void): Promise<void> {
  await syncUseCase.logout()
  dispatch({ type: 'loggedOut' })
}

export async function submitResolveConflict(
  syncUseCase: SyncUseCase,
  dispatch: (action: SyncAction) => void,
  keepLocal: boolean,
): Promise<void> {
  dispatch({ type: 'resolvingConflict' })
  try {
    const result = await syncUseCase.resolveConflict(keepLocal)
    dispatch({ type: 'conflictResolved', result })
  } catch (e) {
    dispatch({ type: 'conflictResolveFailed', error: errorMessage(e) ?? i18n.t('sync.syncFailed') })
  }
}
