import { describe, expect, it } from 'vitest'
import { InMemoryGameTypeRepository } from './inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from './inMemoryMatchRepository'
import { InMemoryPlayerRepository } from './inMemoryPlayerRepository'

describe('InMemoryRepository fakes', () => {
  it('PlayerRepository: save twice with same id does not create a duplicate', () => {
    const repo = new InMemoryPlayerRepository()
    const player = { id: 'p1', name: 'Alice', active: true }

    repo.save(player)
    expect(repo.getAll(true)).toHaveLength(1)

    repo.save({ ...player, name: 'Alice modifie' })
    expect(repo.getAll(true)).toHaveLength(1)
    expect(repo.getAll(true)[0].name).toBe('Alice modifie')
  })

  it('PlayerRepository: save with a different id adds a new element', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.save({ id: 'p2', name: 'Bob', active: true })

    expect(repo.getAll(true)).toHaveLength(2)
  })

  it('PlayerRepository: hardDelete removes the player entirely, unlike delete which soft-deletes', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: false })
    repo.save({ id: 'p2', name: 'Bob', active: true })

    repo.hardDelete('p1')

    expect(repo.getAll(true)).toEqual([{ id: 'p2', name: 'Bob', active: true }])
  })

  it('PlayerRepository: hardDelete of a nonexistent id does not throw', () => {
    const repo = new InMemoryPlayerRepository()

    expect(() => repo.hardDelete('non_existent')).not.toThrow()
  })

  it('GameTypeRepository: save twice with same id does not create a duplicate', () => {
    const repo = new InMemoryGameTypeRepository()
    const gt = {
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE' as const,
      tieBreakRule: 'NONE' as const,
      tieBreakCondition: 'HIGHEST_SCORE' as const,
      tieBreakLabel: null,
      active: true,
    }

    repo.save(gt)
    expect(repo.getAll()).toHaveLength(1)

    repo.save({ ...gt, name: 'Belote modifie' })
    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Belote modifie')
  })

  it('GameTypeRepository: save with a different id adds a new element', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    repo.save({
      id: 'gt2',
      name: 'Tarot',
      winCondition: 'LOWEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })

    expect(repo.getAll()).toHaveLength(2)
  })

  it('MatchRepository: save twice with same id does not create a duplicate', () => {
    const repo = new InMemoryMatchRepository()
    const match = {
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    }

    repo.save(match)
    expect(repo.getAll()).toHaveLength(1)

    repo.save({ ...match, date: 2000 })
    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].date).toBe(2000)
  })

  it('MatchRepository: save with a different id adds a new element', () => {
    const repo = new InMemoryMatchRepository()
    repo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })
    repo.save({
      id: 'm2',
      date: 2000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p2', score: 20 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    expect(repo.getAll()).toHaveLength(2)
  })

  it('PlayerRepository: findById-equivalent lookup preserves data after save upsert', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const fromGetAll = repo.getAll(true)[0]
    expect(fromGetAll).toBeDefined()
    expect(fromGetAll.name).toBe('Alice')
  })

  it('GameTypeRepository: findById preserves data after save upsert', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    const found = repo.findById('gt1')
    expect(found).toBeDefined()
    expect(found?.name).toBe('Belote')
  })

  it('MatchRepository: findById preserves data after save upsert', () => {
    const repo = new InMemoryMatchRepository()
    repo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })
    const found = repo.findById('m1')
    expect(found).toBeDefined()
    expect(found?.date).toBe(1000)
  })

  it('saveAll players adds all in one operation', () => {
    const repo = new InMemoryPlayerRepository()
    repo.saveAll([
      { id: 'p1', name: 'Alice', active: true },
      { id: 'p2', name: 'Bob', active: true },
    ])
    expect(repo.getAll(true)).toHaveLength(2)
  })

  it('saveAll players upserts existing', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.saveAll([{ id: 'p1', name: 'Updated Alice', active: true }])
    expect(repo.getAll(true)[0].name).toBe('Updated Alice')
  })

  it('PlayerRepository: deleteAll clears every player', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.save({ id: 'p2', name: 'Bob', active: false })

    repo.deleteAll()

    expect(repo.getAll(true)).toEqual([])
  })

  it('GameTypeRepository: deleteAll clears every game type', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })

    repo.deleteAll()

    expect(repo.getAll(true)).toEqual([])
  })

  it('MatchRepository: deleteAll clears every match', () => {
    const repo = new InMemoryMatchRepository()
    repo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    repo.deleteAll()

    expect(repo.getAll()).toEqual([])
  })
})
