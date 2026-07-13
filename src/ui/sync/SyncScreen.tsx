import { CheckCircle2, Cloud, Loader2, WifiOff } from 'lucide-react'
import { useEffect, useReducer, useState } from 'react'
import type { SyncUseCase } from '../../application/syncUseCase'
import { LudoButton } from '../shared/LudoButton'
import { submitLogin, submitLogout, submitResolveConflict, submitRestoreSession, syncReducer } from './syncReducer'
import { initialSyncState } from './syncTypes'

export interface SyncScreenProps {
  syncUseCase: SyncUseCase
}

export function SyncScreen({ syncUseCase }: SyncScreenProps) {
  const [state, dispatch] = useReducer(syncReducer, initialSyncState)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    void submitRestoreSession(syncUseCase, dispatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <>
      {!isOnline && (
        <div className="error-msg">
          <span>
            <WifiOff size={16} aria-hidden /> Offline — changes will sync when reconnected
          </span>
        </div>
      )}

      {state.phase === 'Disconnected' && (
        <div className="empty">
          <span className="sync-icon">
            <Cloud size={32} aria-hidden />
          </span>
          <div className="section-label">Cloud Sync</div>
          <div>Sync your data with Google Drive</div>
          <LudoButton
            text="Connect with Google"
            variant="primary"
            onClick={() => void submitLogin(syncUseCase, dispatch)}
          />
        </div>
      )}

      {state.phase === 'Connecting' && <LoadingView message="Connecting to Google..." />}
      {state.phase === 'Detecting' && <LoadingView message="Checking sync status..." />}
      {state.phase === 'Syncing' && <LoadingView message="Synchronising data..." />}

      {state.phase === 'Resolved' && (
        <div className="empty">
          <span className="sync-icon">
            <CheckCircle2 size={32} aria-hidden />
          </span>
          <div className="section-label">Sync complete</div>
          {state.result && (
            <div>
              {state.result.pushed} pushed, {state.result.pulled} pulled
            </div>
          )}
          {state.email && <div className="sync-status">Connected as {state.email}</div>}
          <LudoButton
            text="Disconnect"
            variant="secondary"
            onClick={() => void submitLogout(syncUseCase, dispatch)}
          />
        </div>
      )}

      {state.phase === 'Conflict' &&
        (state.conflict ? (
          <div style={{ padding: '16px 0' }}>
            <div className="modal-title">Sync conflict</div>
            <div className="modal-body">Two versions of your data differ. Choose which one to keep.</div>

            <div className="sync-conflict-container">
              <div className="sync-card">
                <div className="sync-card-title">
                  Local version{state.conflict.localSnapshot.dateLabel ? ` (${state.conflict.localSnapshot.dateLabel})` : ''}
                </div>
                <div className="sync-card-stat">• {state.conflict.localSnapshot.playerCount} players</div>
                <div className="sync-card-stat">• {state.conflict.localSnapshot.gameTypeCount} game types</div>
                <div className="sync-card-stat">• {state.conflict.localSnapshot.matchCount} matches</div>
              </div>
              <div className="sync-card">
                <div className="sync-card-title">
                  Remote version
                  {state.conflict.remoteSnapshot.dateLabel ? ` (${state.conflict.remoteSnapshot.dateLabel})` : ''}
                </div>
                <div className="sync-card-stat">• {state.conflict.remoteSnapshot.playerCount} players</div>
                <div className="sync-card-stat">• {state.conflict.remoteSnapshot.gameTypeCount} game types</div>
                <div className="sync-card-stat">• {state.conflict.remoteSnapshot.matchCount} matches</div>
              </div>
            </div>

            <div className="sync-actions">
              <LudoButton
                text="Keep local"
                variant="primary"
                onClick={() => void submitResolveConflict(syncUseCase, dispatch, true)}
              />
              <LudoButton
                text="Keep remote"
                variant="secondary"
                onClick={() => void submitResolveConflict(syncUseCase, dispatch, false)}
              />
            </div>
          </div>
        ) : (
          <div className="empty">No conflict data available</div>
        ))}

      {state.error && (
        <>
          <div className="error-msg">{state.error}</div>
          <LudoButton text="Dismiss" variant="secondary" onClick={() => dispatch({ type: 'dismissError' })} />
        </>
      )}
    </>
  )
}

function LoadingView({ message }: { message: string }) {
  return (
    <div className="empty">
      <div className="import-zone-icon">
        <Loader2 size={32} aria-hidden />
      </div>
      <div>{message}</div>
    </div>
  )
}
