import { describe, expect, it } from 'vitest'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { ImportMatchesUseCase } from './importMatchesUseCase'
import * as TestImportData from './testImportData'
import { MODULE_MANIFESTS } from '../modules/registry'

function useCase(
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
  currentDate = () => 1767225600000,
) {
  return new ImportMatchesUseCase(playerRepo, gameTypeRepo, matchRepo, currentDate, MODULE_MANIFESTS)
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
        moduleId: null,
        active: true,
      })
      useCase(undefined, gameTypeRepo).execute(TestImportData.validJson)
      expect(gameTypeRepo.getAll()).toHaveLength(1)
      expect(gameTypeRepo.getAll()[0].id).toBe('existing')
    })

    describe('a game a module counts', () => {
      const toriJson = JSON.stringify({
        version: '1.1',
        game: 'La Vallée des Torī',
        winCondition: 'HIGHEST_SCORE',
        games: [
          {
            id: 'tv1',
            date: 1767225600000,
            ranking: [
              { name: 'Alice', score: 42, rank: 1 },
              { name: 'Bob', score: 30, rank: 2 },
            ],
            details: null,
          },
        ],
      })

      // The file never carries a moduleId — it travels between installations
      // where module ids mean nothing — so the name is all the import has to go on.
      it('reuses the bound game type even after the user renamed it', () => {
        const gameTypeRepo = new InMemoryGameTypeRepository()
        gameTypeRepo.save({
          id: 'bound',
          name: 'Torī, chez moi',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          moduleId: 'tori-valley',
          active: true,
        })

        useCase(undefined, gameTypeRepo).execute(toriJson)

        expect(gameTypeRepo.getAll()).toHaveLength(1)
        expect(gameTypeRepo.getAll()[0].id).toBe('bound')
      })

      it('still prefers a name match, so an unbound game type is not duplicated either', () => {
        const gameTypeRepo = new InMemoryGameTypeRepository()
        gameTypeRepo.save({
          id: 'by-name',
          name: 'La Vallée des Torī',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          moduleId: null,
          active: true,
        })

        useCase(undefined, gameTypeRepo).execute(toriJson)

        expect(gameTypeRepo.getAll()).toHaveLength(1)
        expect(gameTypeRepo.getAll()[0].id).toBe('by-name')
      })

      // Binding is lazy: it happens when someone plays the module, not on import.
      it('creates the game type unbound when nothing matches', () => {
        const gameTypeRepo = new InMemoryGameTypeRepository()

        useCase(undefined, gameTypeRepo).execute(toriJson)

        expect(gameTypeRepo.getAll()).toHaveLength(1)
        expect(gameTypeRepo.getAll()[0].name).toBe('La Vallée des Torī')
        expect(gameTypeRepo.getAll()[0].moduleId).toBeNull()
      })

      it('does not reuse a game bound to a module that does not claim this name', () => {
        const gameTypeRepo = new InMemoryGameTypeRepository()
        gameTypeRepo.save({
          id: 'other',
          name: 'Renamed',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'NONE',
          tieBreakCondition: 'HIGHEST_SCORE',
          tieBreakLabel: null,
          moduleId: 'some-other-module',
          active: true,
        })

        useCase(undefined, gameTypeRepo).execute(toriJson)

        expect(gameTypeRepo.getAll()).toHaveLength(2)
      })
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
      matchRepo.save({ id: 'm1', date: 0, gameTypeId: '', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [] })
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
      matchRepo.save({ id: 'm1', date: 0, gameTypeId: '', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [] })
      const result = useCase(undefined, undefined, matchRepo).execute(TestImportData.multiGameJson)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.imported).toBe(1)
        expect(result.value.skipped).toHaveLength(1)
      }
    })

    it('imports legacy files with quoted numeric score/rank/date (Kotlin JsonPrimitive.content leniency)', () => {
      // Kotlin reads these via `(obj["score"] as? JsonPrimitive)?.content?.toIntOrNull()`,
      // which parses the primitive's raw text whether or not the source JSON quoted it.
      const matchRepo = new InMemoryMatchRepository()
      const json = `{
        "version": "1.1",
        "game": "TestGame",
        "games": [
            {
                "id": "m1",
                "date": "1000000",
                "ranking": [
                    {"name": "Alice", "score": "10", "rank": "1"},
                    {"name": "Bob", "score": "5", "rank": "2"}
                ]
            }
        ]
      }`
      const result = useCase(undefined, undefined, matchRepo).execute(json)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.imported).toBe(1)
      expect(matchRepo.getAll()[0].date).toBe(1000000)
      expect(matchRepo.getAll()[0].playerScores.map((s) => s.score)).toEqual([10, 5])
      expect(matchRepo.getAll()[0].manualWinners).toEqual([matchRepo.getAll()[0].playerScores[0].playerId])
    })
  })

  describe('version parsing', () => {
    it('rejects a version with a missing minor part', () => {
      const json = '{"version": "1.", "game": "X", "games": [{"id":"m1","ranking":[{"name":"A","score":1,"rank":1},{"name":"B","score":2,"rank":2}]}]}'
      expect(useCase().preview(json).ok).toBe(false)
    })

    it('rejects a version using scientific notation', () => {
      const json = '{"version": "1e0.1", "game": "X", "games": [{"id":"m1","ranking":[{"name":"A","score":1,"rank":1},{"name":"B","score":2,"rank":2}]}]}'
      expect(useCase().preview(json).ok).toBe(false)
    })

    it('accepts a valid 1.x version', () => {
      const json = '{"version": "1.5", "game": "X", "games": [{"id":"m1","ranking":[{"name":"A","score":1,"rank":1},{"name":"B","score":2,"rank":2}]}]}'
      expect(useCase().preview(json).ok).toBe(true)
    })
  })
})
