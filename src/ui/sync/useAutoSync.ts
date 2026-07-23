import { useEffect } from 'react'
import type { AutoSyncCoordinator } from '../../application/autoSyncCoordinator'

/** No-op when `coordinator` is undefined (no `syncUseCase`, i.e. no `VITE_GOOGLE_CLIENT_ID`). */
export function useAutoSync(coordinator: AutoSyncCoordinator | undefined): void {
  useEffect(() => {
    if (!coordinator) return
    coordinator.start()
    return () => coordinator.stop()
  }, [coordinator])
}
