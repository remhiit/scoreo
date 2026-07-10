import { describe, expect, it } from 'vitest'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { ImportMatchesUseCase } from './importMatchesUseCase'
import * as TestImportData from './testImportData'

function useCase(
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
  currentDate = () => 1767225600000,
) {
  return new ImportMatchesUseCase(playerRepo, gameTypeRepo, matchRepo, currentDate)
}

describe('ImportMatchesUseCase', () => {
  describe('preview', () => {
    it('returns game name and count for valid JSON', () => {
      const result = useCase().preview(TestImportData.validJson)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.gameName).toBe('TestGame')
        expect(result.value.count).toBe(1)
      }
    })

    it('returns failure for invalid JSON', () => {
      const result = useCase().preview(TestImportData.invalidJson)
      expect(result.ok).toBe(false)
    })

    it('returns failure for unsupported version', () => {
      const json = '{"version": "2.0", "game": "X", "games": []}'
      const result = useCase().preview(json)
      expect(result.ok).toBe(false)
    })

    it('returns failure for empty games', () => {
      const result = useCase().preview(TestImportData.emptyGamesJson)
      expect(result.ok).toBe(false)
    })

    it('returns failure for games with fewer than 2 entries', () => {
      const json = `{
        "version": "1.1",
        "game": "X",
        "games": [{"id": "m1", "ranking": [{"name":"A","score":1,"rank":1}]}]
      }`
      const result = useCase().preview(json)
      expect(result.ok).toBe(false)
    })
  })

  describe('execute', () => {
    it('imports matches and returns count', () => {
      const result = useCase().execute(TestImportData.validJson)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.imported).toBe(1)
    })

    it('saves matches to repository', () => {
      const matchRepo = new InMemoryMatchRepository()
      useCase(undefined, undefined, matchRepo).execute(TestImportData.validJson)
      expect(matchRepo.getAll()).toHaveLength(1)
    })

    it('auto-creates game type', () => {
      const gameTypeRepo = new InMemoryGameTypeRepository()
      useCase(undefined, gameTypeRepo).execute(TestImportData.validJson)
      const gameTypes = gameTypeRepo.getAll()
      expect(gameTypes).toHaveLength(1)
      expect(gameTypes[0].name).toBe('TestGame')
    })

    it('reuses existing game type by name', () => {
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save({
        id: 'existing',
        name: 'TestGame',
        winCondition: 'MANUAL',
        tieBreakRule: 'NONE',
        tieBreakCondition: 'HIGHEST_SCORE',
        tieBreakLabel: null,
        active: true,
      })
      useCase(undefined, gameTypeRepo).execute(TestImportData.validJson)
      expect(gameTypeRepo.getAll()).toHaveLength(1)
      expect(gameTypeRepo.getAll()[0].id).toBe('existing')
    })

    it('auto-creates unknown players', () => {
      const playerRepo = new InMemoryPlayerRepository()
      useCase(playerRepo).execute(TestImportData.validJson)
      const players = playerRepo.getAll()
      expect(players).toHaveLength(2)
      expect(players.some((p) => p.name === 'Alice')).toBe(true)
      expect(players.some((p) => p.name === 'Bob')).toBe(true)
    })

    it('reuses existing players by name', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save({ id: 'p1', name: 'Alice', active: true })
      useCase(playerRepo).execute(TestImportData.validJson)
      expect(playerRepo.getAll()).toHaveLength(2)
    })

    it('skips matches with duplicate IDs', () => {
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save({ id: 'm1', date: 0, gameTypeId: '', playerScores: [], manualWinners: [], secondaryPlayerScores: [] })
      const result = useCase(undefined, undefined, matchRepo).execute(TestImportData.validJson)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.imported).toBe(0)
        expect(result.value.skipped).toHaveLength(1)
      }
    })

    it('with detail verification passes when sums match', () => {
      const result = useCase().execute(TestImportData.withDetailsJson)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.imported).toBe(1)
    })

    it('with detail verification fails when sums mismatch', () => {
      const matchRepo = new InMemoryMatchRepository()
      const result = useCase(undefined, undefined, matchRepo).execute(TestImportData.withMismatchedDetailsJson)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.imported).toBe(0)
        expect(result.value.failed).toHaveLength(1)
      }
    })

    it('without date uses currentDate fallback', () => {
      const matchRepo = new InMemoryMatchRepository()
      useCase(undefined, undefined, matchRepo, () => 999999).execute(TestImportData.withoutDateJson)
      expect(matchRepo.getAll()).toHaveLength(1)
      expect(matchRepo.getAll()[0].date).toBe(999999)
    })

    it('imports multiple games', () => {
      const matchRepo = new InMemoryMatchRepository()
      const result = useCase(undefined, undefined, matchRepo).execute(TestImportData.multiGameJson)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.imported).toBe(2)
      expect(matchRepo.getAll()).toHaveLength(2)
    })

    it('with duplicate in first game still imports others', () => {
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save({ id: 'm1', date: 0, gameTypeId: '', playerScores: [], manualWinners: [], secondaryPlayerScores: [] })
      const result = useCase(undefined, undefined, matchRepo).execute(TestImportData.multiGameJson)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.imported).toBe(1)
        expect(result.value.skipped).toHaveLength(1)
      }
    })
  })
})
