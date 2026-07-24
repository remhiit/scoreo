import type { DataChangeNotifier } from '../domain/port/dataChangeNotifier'
import type { SyncUseCase } from './syncUseCase'

const DEBOUNCE_MS = 2500

/**
 * Pushes local data to Drive shortly after each local mutation, debounced so a burst
 * of edits (e.g. entering a round's scores) collapses into a single push.
 */
export class AutoSyncCoordinator {
  private unsubscribe: (() => void) | undefined
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly notifier: DataChangeNotifier,
    private readonly syncUseCase: SyncUseCase,
  ) {}

  start(): void {
    if (this.unsubscribe) return
    this.unsubscribe = this.notifier.subscribe(() => this.scheduleFlush())
  }

  stop(): void {
    this.unsubscribe?.()
    this.unsubscribe = undefined
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  private scheduleFlush(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.flush()
    }, DEBOUNCE_MS)
  }

  private async flush(): Promise<void> {
    if (!navigator.onLine) return
    try {
      await this.syncUseCase.pushLocalData()
    } catch {
      // Token expired, network error, ... — the next local change reschedules a push.
      console.error('Scoreo: la synchronisation automatique avec Drive a échoué.')
    }
  }
}
