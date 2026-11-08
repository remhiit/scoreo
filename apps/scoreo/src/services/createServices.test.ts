import { describe, expect, it } from 'vitest'
import { AutoSyncCoordinator } from '../application/autoSyncCoordinator'
import { SyncUseCase } from '../application/syncUseCase'
import { InMemoryCloudSyncRepository } from '../infrastructure/testing/inMemoryCloudSyncRepository'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { newGameType } from '../domain/model/gameType'
import { ModuleRulesGameTypeRepository } from '../modules/moduleRulesGameTypeRepository'
import { createServices } from './createServices'

function baseOptions() {
  return {
    playerRepository: new InMemoryPlayerRepository(),
    gameTypeRepository: new InMemoryGameTypeRepository(),
    matchRepository: new InMemoryMatchRepository(),
    matchDraftRepository: new InMemoryMatchDraftRepository(),
  }
}

describe('createServices', () => {
  it('cloudSyncRepository/syncUseCase/autoSyncCoordinator are undefined when no cloud repository is available', () => {
    const services = createServices(baseOptions())

    expect(services.cloudSyncRepository).toBeUndefined()
    expect(services.syncUseCase).toBeUndefined()
    expect(services.autoSyncCoordinator).toBeUndefined()
  })

  it('cloudSyncRepository/syncUseCase/autoSyncCoordinator are created when a cloud repository is provided', () => {
    const cloudSyncRepository = new InMemoryCloudSyncRepository()
    const services = createServices({ ...baseOptions(), cloudSyncRepository })

    expect(services.cloudSyncRepository).toBe(cloudSyncRepository)
    expect(services.syncUseCase).toBeInstanceOf(SyncUseCase)
    expect(services.autoSyncCoordinator).toBeInstanceOf(AutoSyncCoordinator)
  })

  it('exposes the repositories passed in, unchanged', () => {
    const options = baseOptions()
    const services = createServices(options)

    expect(services.playerRepository).toBe(options.playerRepository)
    expect(services.gameTypeRepository).toBeInstanceOf(ModuleRulesGameTypeRepository)
    expect(services.matchRepository).toBe(options.matchRepository)
    expect(services.matchDraftRepository).toBe(options.matchDraftRepository)
  })

  it('defaults currentDate to Date.now when not provided', () => {
    const services = createServices(baseOptions())
    const before = Date.now()
    const value = services.currentDate()
    const after = Date.now()

    expect(value).toBeGreaterThanOrEqual(before)
    expect(value).toBeLessThanOrEqual(after)
  })

  it('wires every use case on the module-rules repository except the sync, which keeps the raw one', async () => {
    const options = baseOptions()
    options.gameTypeRepository.save(
      newGameType('g1', 'Skyjo', 'HIGHEST_SCORE', { moduleId: 'skyjo' }),
    )
    const cloudSyncRepository = new InMemoryCloudSyncRepository()
    const services = createServices({ ...options, cloudSyncRepository })

    // Reads through the services see the manifest's rules...
    expect(services.gameTypeRepository.findById('g1')?.winCondition).toBe('LOWEST_SCORE')
    // ...the raw store is untouched, and the sync works on it.
    expect(options.gameTypeRepository.findById('g1')?.winCondition).toBe('HIGHEST_SCORE')
    cloudSyncRepository.connected = true
    await services.syncUseCase?.pushLocalData()
    const pushed = cloudSyncRepository.storedData?.gameTypes.find((g) => g.id === 'g1')
    expect(pushed?.winCondition).toBe('HIGHEST_SCORE')
    expect(pushed?.tieBreakRule).toBe('NONE')
  })
})
