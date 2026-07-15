import { describe, expect, it } from 'vitest'
import { InMemoryCloudSyncRepository } from '../infrastructure/testing/inMemoryCloudSyncRepository'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { SyncUseCase } from './syncUseCase'

function buildUseCase(
  cloudRepo = new InMemoryCloudSyncRepository(),
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
) {
  return new SyncUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)
}

describe('SyncUseCase', () => {
  it('autoSync both empty returns Synced with zero counts', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    const useCase = buildUseCase(cloudRepo)

    const outcome = await useCase.autoSync()

    expect(outcome.kind).toBe('Synced')
    if (outcome.kind === 'Synced') {
      expect(outcome.result.pushed).toBe(0)
      expect(outcome.result.pulled).toBe(0)
      expect(outcome.result.timestamp).toBeGreaterThan(0)
    }
  })

  it('autoSync local has data remote empty pushes to remote', async () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Test',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
    })
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    const outcome = await useCase.autoSync()

    expect(outcome.kind).toBe('Synced')
    if (outcome.kind === 'Synced') {
      expect(outcome.result.pushed).toBe(3)
      expect(outcome.result.pulled).toBe(0)
      expect(outcome.result.timestamp).toBeGreaterThan(0)
    }

    const pushed = cloudRepo.storedData!
    expect(pushed.players).toHaveLength(1)
    expect(pushed.gameTypes).toHaveLength(1)
    expect(pushed.matches).toHaveLength(1)
  })

  it('autoSync remote has data local empty pulls to local', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    cloudRepo.storedData = {
      players: [{ id: 'p1', name: 'Alice', active: true }],
      gameTypes: [
        {
          id: 'gt1',
          name: 'Test',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          active: true,
        },
      ],
      matches: [
        {
          id: 'm1',
          date: 1000,
          gameTypeId: 'gt1',
          playerScores: [{ playerId: 'p1', score: 10 }],
          manualWinners: [],
          secondaryPlayerScores: [],
        },
      ],
      lastModified: 1000,
    }
    const playerRepo = new InMemoryPlayerRepository()
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    const outcome = await useCase.autoSync()

    expect(outcome.kind).toBe('Synced')
    if (outcome.kind === 'Synced') {
      expect(outcome.result.pushed).toBe(0)
      expect(outcome.result.pulled).toBe(3)
      expect(outcome.result.timestamp).toBeGreaterThan(0)
    }

    expect(playerRepo.getAll(true)).toHaveLength(1)
    expect(gameTypeRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()).toHaveLength(1)
  })

  it('autoSync both have same data returns Synced', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    cloudRepo.storedData = {
      players: [{ id: 'p1', name: 'Alice', active: true }],
      gameTypes: [
        {
          id: 'gt1',
          name: 'Test',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          active: true,
        },
      ],
      matches: [
        {
          id: 'm1',
          date: 1000,
          gameTypeId: 'gt1',
          playerScores: [{ playerId: 'p1', score: 10 }],
          manualWinners: [],
          secondaryPlayerScores: [],
        },
      ],
      lastModified: 1000,
    }
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Test',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
    })
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    const outcome = await useCase.autoSync()

    expect(outcome.kind).toBe('Synced')
    if (outcome.kind === 'Synced') {
      expect(outcome.result.pushed).toBe(0)
      expect(outcome.result.pulled).toBe(0)
      expect(outcome.result.timestamp).toBeGreaterThan(0)
    }
  })

  it('autoSync both have different data returns Conflict', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    cloudRepo.storedData = {
      players: [{ id: 'p2', name: 'Bob', active: true }],
      gameTypes: [
        {
          id: 'gt1',
          name: 'Test',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          active: true,
        },
      ],
      matches: [
        {
          id: 'm1',
          date: 1000,
          gameTypeId: 'gt1',
          playerScores: [{ playerId: 'p2', score: 10 }],
          manualWinners: [],
          secondaryPlayerScores: [],
        },
      ],
      lastModified: 1000,
    }
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Test',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
    })
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    const outcome = await useCase.autoSync()

    expect(outcome.kind).toBe('Conflict')
    if (outcome.kind === 'Conflict') {
      expect(outcome.conflict.localSnapshot.playerCount).toBe(1)
      expect(outcome.conflict.remoteSnapshot.playerCount).toBe(1)
      expect(outcome.conflict.localSnapshot.matchCount).toBe(1)
      expect(outcome.conflict.remoteSnapshot.matchCount).toBe(1)
      expect(outcome.conflict.localSnapshot.gameTypeCount).toBe(1)
      expect(outcome.conflict.remoteSnapshot.gameTypeCount).toBe(1)
    }
  })

  it('resolveConflict keepLocal pushes local data to remote', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Test',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
    })
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    const result = await useCase.resolveConflict(true)

    expect(result.pushed).toBe(4)
    expect(result.pulled).toBe(0)
    expect(result.timestamp).toBeGreaterThan(0)

    const pushed = cloudRepo.storedData!
    expect(pushed.players).toHaveLength(2)
    expect(pushed.gameTypes).toHaveLength(1)
    expect(pushed.matches).toHaveLength(1)
  })

  it('resolveConflict keepRemote pulls remote data to local', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    cloudRepo.storedData = {
      players: [
        { id: 'p1', name: 'Alice', active: true },
        { id: 'p2', name: 'Bob', active: true },
      ],
      gameTypes: [
        {
          id: 'gt1',
          name: 'Test',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          active: true,
        },
      ],
      matches: [
        {
          id: 'm1',
          date: 1000,
          gameTypeId: 'gt1',
          playerScores: [{ playerId: 'p1', score: 10 }],
          manualWinners: [],
          secondaryPlayerScores: [],
        },
      ],
      lastModified: 1000,
    }
    const playerRepo = new InMemoryPlayerRepository()
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    const result = await useCase.resolveConflict(false)

    expect(result.pushed).toBe(0)
    expect(result.pulled).toBe(4)
    expect(result.timestamp).toBeGreaterThan(0)

    expect(playerRepo.getAll(true)).toHaveLength(2)
    expect(gameTypeRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()).toHaveLength(1)
  })

  it('resolveConflict keepRemote replaces local data instead of merging it', async () => {
    // Regression test: writeRemoteToLocal used to only saveAll (upsert), so a local
    // player/gameType/match absent from the remote dataset would survive "Keep remote"
    // — effectively merging instead of replacing. deleteAll() must run first.
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    cloudRepo.storedData = {
      players: [{ id: 'p1', name: 'Alice', active: true }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    }
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob (local only)', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save({
      id: 'gt-local-only',
      name: 'Local only',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm-local-only',
      date: 1000,
      gameTypeId: 'gt-local-only',
      playerScores: [{ playerId: 'p2', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
    })
    const useCase = buildUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo)

    await useCase.resolveConflict(false)

    expect(playerRepo.getAll(true)).toEqual([{ id: 'p1', name: 'Alice', active: true }])
    expect(gameTypeRepo.getAll()).toEqual([])
    expect(matchRepo.getAll()).toEqual([])
  })

  it('autoSync treats identical data as Synced even with different object key order', async () => {
    // Regression test: isSameState used to compare via JSON.stringify, which is
    // key-order-sensitive. A real adapter round-tripping through JSON.parse can easily
    // produce a different key order than locally-constructed objects even when the
    // data is semantically identical, which would incorrectly report a Conflict.
    const cloudRepo = new InMemoryCloudSyncRepository()
    await cloudRepo.login()
    cloudRepo.storedData = {
      // Same Alice, but constructed with reversed key order compared to playerRepo below.
      players: [{ active: true, name: 'Alice', id: 'p1' }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    }
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = buildUseCase(cloudRepo, playerRepo)

    const outcome = await useCase.autoSync()

    expect(outcome.kind).toBe('Synced')
  })
})
