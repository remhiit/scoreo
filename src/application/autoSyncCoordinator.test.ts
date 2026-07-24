import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoSyncCoordinator } from './autoSyncCoordinator'
import { InMemoryDataChangeNotifier } from '../infrastructure/events/inMemoryDataChangeNotifier'
import { SyncUseCase } from './syncUseCase'
import { InMemoryCloudSyncRepository } from '../infrastructure/testing/inMemoryCloudSyncRepository'
import { InMemoryConnectivityChecker } from '../infrastructure/testing/inMemoryConnectivityChecker'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'

function buildSyncUseCase(notifier: InMemoryDataChangeNotifier) {
  const cloudRepo = new InMemoryCloudSyncRepository()
  return { cloudRepo, syncUseCase: new SyncUseCase(cloudRepo, new InMemoryPlayerRepository(), new InMemoryGameTypeRepository(), new InMemoryMatchRepository(), notifier) }
}

describe('AutoSyncCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('pushes after the debounce delay following a data change', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { cloudRepo, syncUseCase } = buildSyncUseCase(notifier)
    await cloudRepo.login()
    const pushSpy = vi.spyOn(syncUseCase, 'pushLocalData')
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()

    notifier.notifyChanged()
    expect(pushSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2500)

    expect(pushSpy).toHaveBeenCalledTimes(1)
  })

  it('collapses a burst of changes into a single push', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { cloudRepo, syncUseCase } = buildSyncUseCase(notifier)
    await cloudRepo.login()
    const pushSpy = vi.spyOn(syncUseCase, 'pushLocalData')
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(1000)
    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(1000)
    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)

    expect(pushSpy).toHaveBeenCalledTimes(1)
  })

  it('does not push while offline', async () => {
    const connectivityChecker = new InMemoryConnectivityChecker()
    connectivityChecker.setOnline(false)
    const notifier = new InMemoryDataChangeNotifier()
    const { cloudRepo, syncUseCase } = buildSyncUseCase(notifier)
    await cloudRepo.login()
    const pushSpy = vi.spyOn(syncUseCase, 'pushLocalData')
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, connectivityChecker)
    coordinator.start()

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)

    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('swallows a push error instead of throwing', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { syncUseCase } = buildSyncUseCase(notifier)
    vi.spyOn(syncUseCase, 'pushLocalData').mockRejectedValue(new Error('token expired'))
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()

    notifier.notifyChanged()

    await expect(vi.advanceTimersByTimeAsync(2500)).resolves.not.toThrow()
  })

  it('logs a generic error when a push fails', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { syncUseCase } = buildSyncUseCase(notifier)
    vi.spyOn(syncUseCase, 'pushLocalData').mockRejectedValue(new Error('token expired'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)

    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('a change after a completed flush schedules a new push', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { cloudRepo, syncUseCase } = buildSyncUseCase(notifier)
    await cloudRepo.login()
    const pushSpy = vi.spyOn(syncUseCase, 'pushLocalData')
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)
    expect(pushSpy).toHaveBeenCalledTimes(1)

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)
    expect(pushSpy).toHaveBeenCalledTimes(2)
  })

  it('stop cancels a pending push and unsubscribes from the notifier', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { cloudRepo, syncUseCase } = buildSyncUseCase(notifier)
    await cloudRepo.login()
    const pushSpy = vi.spyOn(syncUseCase, 'pushLocalData')
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()

    notifier.notifyChanged()
    coordinator.stop()
    await vi.advanceTimersByTimeAsync(2500)
    expect(pushSpy).not.toHaveBeenCalled()

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('start is idempotent: calling it twice does not double-subscribe', async () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { cloudRepo, syncUseCase } = buildSyncUseCase(notifier)
    await cloudRepo.login()
    const pushSpy = vi.spyOn(syncUseCase, 'pushLocalData')
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())
    coordinator.start()
    coordinator.start()

    notifier.notifyChanged()
    await vi.advanceTimersByTimeAsync(2500)

    expect(pushSpy).toHaveBeenCalledTimes(1)
  })

  it('stop is idempotent: calling it when not started does not throw', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const { syncUseCase } = buildSyncUseCase(notifier)
    const coordinator = new AutoSyncCoordinator(notifier, syncUseCase, new InMemoryConnectivityChecker())

    expect(() => {
      coordinator.stop()
      coordinator.stop()
    }).not.toThrow()
  })
})
