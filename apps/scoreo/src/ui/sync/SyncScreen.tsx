import {
  Button,
  ButtonRow,
  Comparison,
  ComparisonCard,
  EmptyState,
  Stack,
  StatusLine,
  Text,
} from '@scoreboards/design-system'
import { useEffect, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SyncUseCase } from '../../application/syncUseCase'
import {
  submitLogin,
  submitLogout,
  submitResolveConflict,
  submitRestoreSession,
  syncReducer,
} from './syncReducer'
import { initialSyncState } from './syncTypes'

export interface SyncScreenProps {
  syncUseCase: SyncUseCase
}

export function SyncScreen({ syncUseCase }: SyncScreenProps) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(syncReducer, initialSyncState, (s) => ({
    ...s,
    phase: 'Restoring' as const,
  }))
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

  const disconnectButton = (
    <Button variant="secondary" onClick={() => void submitLogout(syncUseCase, dispatch)}>
      {t('sync.disconnect')}
    </Button>
  )

  return (
    <Stack gap={4}>
      {!isOnline && <StatusLine tone="warning">{t('sync.offline')}</StatusLine>}

      {state.phase === 'Disconnected' && (
        <EmptyState icon="cloud" title={t('sync.cloudSync')}>
          <Stack gap={4} align="center">
            <Text>{t('sync.syncYourData')}</Text>
            {state.connected ? (
              disconnectButton
            ) : (
              <Button onClick={() => void submitLogin(syncUseCase, dispatch)}>
                {t('sync.connectWithGoogle')}
              </Button>
            )}
          </Stack>
        </EmptyState>
      )}

      {state.phase === 'Restoring' && (
        <EmptyState icon="loader">{t('sync.restoringSession')}</EmptyState>
      )}
      {state.phase === 'Connecting' && (
        <EmptyState icon="loader">{t('sync.connectingToGoogle')}</EmptyState>
      )}
      {state.phase === 'Detecting' && (
        <EmptyState icon="loader">{t('sync.checkingSyncStatus')}</EmptyState>
      )}
      {state.phase === 'Syncing' && (
        <EmptyState icon="loader">{t('sync.synchronisingData')}</EmptyState>
      )}

      {state.phase === 'Resolved' && (
        <Stack gap={4} align="center">
          <StatusLine tone="success">{t('sync.syncComplete')}</StatusLine>
          {state.result && (
            <Text variant="muted">
              {t('sync.syncSummary', { pushed: state.result.pushed, pulled: state.result.pulled })}
            </Text>
          )}
          {disconnectButton}
        </Stack>
      )}

      {state.phase === 'Conflict' &&
        (state.conflict ? (
          <Stack gap={4}>
            <Stack gap={1}>
              <Text variant="title">{t('sync.syncConflict')}</Text>
              <Text variant="muted">{t('sync.conflictBody')}</Text>
            </Stack>

            {/* Two symmetric cards and two equal buttons: no side is pre-picked. */}
            <Comparison>
              <ComparisonCard
                title={`${t('sync.localVersion')}${
                  state.conflict.localSnapshot.dateLabel
                    ? ` (${state.conflict.localSnapshot.dateLabel})`
                    : ''
                }`}
                stats={[
                  t('sync.players', { count: state.conflict.localSnapshot.playerCount }),
                  t('sync.gameTypes', { count: state.conflict.localSnapshot.gameTypeCount }),
                  t('sync.matches', { count: state.conflict.localSnapshot.matchCount }),
                ]}
              />
              <ComparisonCard
                title={`${t('sync.remoteVersion')}${
                  state.conflict.remoteSnapshot.dateLabel
                    ? ` (${state.conflict.remoteSnapshot.dateLabel})`
                    : ''
                }`}
                stats={[
                  t('sync.players', { count: state.conflict.remoteSnapshot.playerCount }),
                  t('sync.gameTypes', { count: state.conflict.remoteSnapshot.gameTypeCount }),
                  t('sync.matches', { count: state.conflict.remoteSnapshot.matchCount }),
                ]}
              />
            </Comparison>

            <ButtonRow>
              <Button
                variant="secondary"
                onClick={() => void submitResolveConflict(syncUseCase, dispatch, true)}
              >
                {t('sync.keepLocal')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void submitResolveConflict(syncUseCase, dispatch, false)}
              >
                {t('sync.keepRemote')}
              </Button>
            </ButtonRow>
          </Stack>
        ) : (
          <EmptyState>{t('sync.noConflictData')}</EmptyState>
        ))}

      {state.error && (
        <Stack gap={2} align="start">
          <Text variant="error">{state.error}</Text>
          <Button variant="secondary" onClick={() => dispatch({ type: 'dismissError' })}>
            {t('sync.dismiss')}
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
