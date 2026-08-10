import { CheckCircle2, Cloud, Loader2, WifiOff } from 'lucide-react'
import { useEffect, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SyncUseCase } from '../../application/syncUseCase'
import { LudoButton } from '../shared/LudoButton'
import { submitLogin, submitLogout, submitResolveConflict, submitRestoreSession, syncReducer } from './syncReducer'
import { initialSyncState } from './syncTypes'

export interface SyncScreenProps {
  syncUseCase: SyncUseCase
}

export function SyncScreen({ syncUseCase }: SyncScreenProps) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(syncReducer, initialSyncState, (s) => ({ ...s, phase: 'Restoring' as const }))
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
            <WifiOff size={16} aria-hidden /> {t('sync.offline')}
          </span>
        </div>
      )}

      {state.phase === 'Disconnected' && (
        <div className="empty">
          <span className="sync-icon">
            <Cloud size={32} aria-hidden />
          </span>
          <div className="section-label">{t('sync.cloudSync')}</div>
          <div>{t('sync.syncYourData')}</div>
          {state.connected ? (
            <LudoButton
              text={t('sync.disconnect')}
              variant="secondary"
              onClick={() => void submitLogout(syncUseCase, dispatch)}
            />
          ) : (
            <LudoButton
              text={t('sync.connectWithGoogle')}
              variant="primary"
              onClick={() => void submitLogin(syncUseCase, dispatch)}
            />
          )}
        </div>
      )}

      {state.phase === 'Restoring' && <LoadingView message={t('sync.restoringSession')} />}
      {state.phase === 'Connecting' && <LoadingView message={t('sync.connectingToGoogle')} />}
      {state.phase === 'Detecting' && <LoadingView message={t('sync.checkingSyncStatus')} />}
      {state.phase === 'Syncing' && <LoadingView message={t('sync.synchronisingData')} />}

      {state.phase === 'Resolved' && (
        <div className="empty">
          <span className="sync-icon">
            <CheckCircle2 size={32} aria-hidden />
          </span>
          <div className="section-label">{t('sync.syncComplete')}</div>
          {state.result && (
            <div>{t('sync.syncSummary', { pushed: state.result.pushed, pulled: state.result.pulled })}</div>
          )}
          <LudoButton
            text={t('sync.disconnect')}
            variant="secondary"
            onClick={() => void submitLogout(syncUseCase, dispatch)}
          />
        </div>
      )}

      {state.phase === 'Conflict' &&
        (state.conflict ? (
          <div style={{ padding: '16px 0' }}>
            <div className="modal-title">{t('sync.syncConflict')}</div>
            <div className="modal-body">{t('sync.conflictBody')}</div>

            <div className="sync-conflict-container">
              <div className="sync-card">
                <div className="sync-card-title">
                  {t('sync.localVersion')}
                  {state.conflict.localSnapshot.dateLabel ? ` (${state.conflict.localSnapshot.dateLabel})` : ''}
                </div>
                <div className="sync-card-stat">{t('sync.players', { count: state.conflict.localSnapshot.playerCount })}</div>
                <div className="sync-card-stat">
                  {t('sync.gameTypes', { count: state.conflict.localSnapshot.gameTypeCount })}
                </div>
                <div className="sync-card-stat">{t('sync.matches', { count: state.conflict.localSnapshot.matchCount })}</div>
              </div>
              <div className="sync-card">
                <div className="sync-card-title">
                  {t('sync.remoteVersion')}
                  {state.conflict.remoteSnapshot.dateLabel ? ` (${state.conflict.remoteSnapshot.dateLabel})` : ''}
                </div>
                <div className="sync-card-stat">{t('sync.players', { count: state.conflict.remoteSnapshot.playerCount })}</div>
                <div className="sync-card-stat">
                  {t('sync.gameTypes', { count: state.conflict.remoteSnapshot.gameTypeCount })}
                </div>
                <div className="sync-card-stat">{t('sync.matches', { count: state.conflict.remoteSnapshot.matchCount })}</div>
              </div>
            </div>

            <div className="sync-actions">
              <LudoButton
                text={t('sync.keepLocal')}
                variant="primary"
                onClick={() => void submitResolveConflict(syncUseCase, dispatch, true)}
              />
              <LudoButton
                text={t('sync.keepRemote')}
                variant="secondary"
                onClick={() => void submitResolveConflict(syncUseCase, dispatch, false)}
              />
            </div>
          </div>
        ) : (
          <div className="empty">{t('sync.noConflictData')}</div>
        ))}

      {state.error && (
        <>
          <div className="error-msg">{state.error}</div>
          <LudoButton text={t('sync.dismiss')} variant="secondary" onClick={() => dispatch({ type: 'dismissError' })} />
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
