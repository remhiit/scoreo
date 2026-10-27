import { describe, expect, it } from 'vitest'
import { ValidationError } from '../domain/model/errors'
import type { Match } from '../domain/model/match'
import type { PlayerScore } from '../domain/model/playerScore'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { AddGameTypeUseCase } from './addGameTypeUseCase'
import { UpdateGameTypeUseCase } from './updateGameTypeUseCase'

describe('UpdateGameTypeUseCase', () => {
  it('updates game type in repository', () => {
    const repo = new InMemoryGameTypeRepository()
    const addUseCase = new AddGameTypeUseCase(repo)
    const updateUseCase = new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository())

    const created = addUseCase.invoke('Belote', 'HIGHEST_SCORE')
    updateUseCase.invoke({ ...created, name: 'Belote Updated' })

    expect(repo.findById(created.id)?.name).toBe('Belote Updated')
  })

  it('updates tie break rule', () => {
    const repo = new InMemoryGameTypeRepository()
    const addUseCase = new AddGameTypeUseCase(repo)
    const updateUseCase = new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository())

    const created = addUseCase.invoke('Golf', 'HIGHEST_SCORE')
    updateUseCase.invoke({
      ...created,
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Handicap',
    })

    const result = repo.findById(created.id)
    expect(result?.tieBreakRule).toBe('SECONDARY_SCORE')
    expect(result?.tieBreakCondition).toBe('LOWEST_SCORE')
    expect(result?.tieBreakLabel).toBe('Handicap')
  })

  it('preserves game type id', () => {
    const repo = new InMemoryGameTypeRepository()
    const addUseCase = new AddGameTypeUseCase(repo)
    const updateUseCase = new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository())

    const created = addUseCase.invoke('Belote', 'HIGHEST_SCORE')
    const originalId = created.id
    updateUseCase.invoke({ ...created, name: 'Belote Updated' })

    expect(repo.findById(originalId)?.id).toBe(originalId)
  })

  it('saves the player range', () => {
    const repo = new InMemoryGameTypeRepository()
    const created = new AddGameTypeUseCase(repo).invoke('Tarot', 'HIGHEST_SCORE')
    const update = new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository())

    update.invoke({ ...created, minPlayers: 3, maxPlayers: 5 })
    expect(repo.findById(created.id)).toMatchObject({ minPlayers: 3, maxPlayers: 5 })

    update.invoke({ ...created, minPlayers: 4, maxPlayers: 4 })
    expect(repo.findById(created.id)).toMatchObject({ minPlayers: 4, maxPlayers: 4 })

    update.invoke({ ...created, minPlayers: null, maxPlayers: null })
    expect(repo.findById(created.id)).toMatchObject({ minPlayers: null, maxPlayers: null })
  })

  it('refuses a minimum above the maximum and keeps the saved game', () => {
    const repo = new InMemoryGameTypeRepository()
    const created = new AddGameTypeUseCase(repo).invoke('Tarot', 'HIGHEST_SCORE')
    const update = new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository())

    expect(() => update.invoke({ ...created, name: 'X', minPlayers: 5, maxPlayers: 3 })).toThrow(
      ValidationError,
    )
    expect(() => update.invoke({ ...created, minPlayers: 0 })).toThrow(ValidationError)
    expect(repo.findById(created.id)).toMatchObject({ name: 'Tarot', minPlayers: null })
  })

  it('updates the scoring mode', () => {
    const repo = new InMemoryGameTypeRepository()
    const created = new AddGameTypeUseCase(repo).invoke('Tarot', 'HIGHEST_SCORE')
    new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository()).invoke({
      ...created,
      scoringMode: 'ROUNDS_WON',
    })
    expect(repo.findById(created.id)?.scoringMode).toBe('ROUNDS_WON')
  })

  it('forces POINTS when the win condition is MANUAL', () => {
    const repo = new InMemoryGameTypeRepository()
    const created = new AddGameTypeUseCase(repo).invoke('Tarot', 'HIGHEST_SCORE')
    new UpdateGameTypeUseCase(repo, new InMemoryMatchRepository()).invoke({
      ...created,
      winCondition: 'MANUAL',
      scoringMode: 'ROUNDS_WON',
    })
    expect(repo.findById(created.id)?.scoringMode).toBe('POINTS')
  })

  describe('recomputing matches when the scoring changes', () => {
    // Raw rounds 10/2, 1/8, 9/3: 20/13 in points, 2/1 rounds won (highest wins a round).
    const rawRounds: PlayerScore[][] = [
      [
        { playerId: 'a', score: 10 },
        { playerId: 'b', score: 2 },
      ],
      [
        { playerId: 'a', score: 1 },
        { playerId: 'b', score: 8 },
      ],
      [
        { playerId: 'a', score: 9 },
        { playerId: 'b', score: 3 },
      ],
    ]
    const match = (
      id: string,
      gameTypeId: string,
      a: number,
      b: number,
      rounds: PlayerScore[][] = rawRounds,
      extra: Partial<Match> = {},
    ): Match => ({
      id,
      date: 0,
      gameTypeId,
      playerScores: [
        { playerId: 'a', score: a },
        { playerId: 'b', score: b },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds,
      moduleData: null,
      ...extra,
    })
    const scoresOf = (matches: InMemoryMatchRepository, id: string) =>
      matches.findById(id)?.playerScores.map((ps) => ps.score)

    function setup(scoringMode: 'POINTS' | 'ROUNDS_WON', moduleId: string | null = null) {
      const gameTypes = new InMemoryGameTypeRepository()
      const matches = new InMemoryMatchRepository()
      const added = new AddGameTypeUseCase(gameTypes).invoke('Tarot', 'HIGHEST_SCORE', {
        scoringMode,
      })
      const created = { ...added, moduleId }
      gameTypes.save(created)
      return { gameTypes, matches, created, update: new UpdateGameTypeUseCase(gameTypes, matches) }
    }

    it('rewrites points as rounds won when switching to ROUNDS_WON', () => {
      const { matches, created, update } = setup('POINTS')
      matches.save(match('m1', created.id, 20, 13))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([2, 1])
      expect(matches.findById('m1')?.rounds).toEqual(rawRounds)
    })

    it('rewrites rounds won as points when switching back to POINTS', () => {
      const { matches, created, update } = setup('ROUNDS_WON')
      matches.save(match('m1', created.id, 2, 1))
      update.invoke({ ...created, scoringMode: 'POINTS' })
      expect(scoresOf(matches, 'm1')).toEqual([20, 13])
    })

    it('never recomputes the matches of a module-bound game into rounds won', () => {
      const { gameTypes, matches, created, update } = setup('POINTS', 'tori-valley')
      matches.save(match('m1', created.id, 20, 13))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([20, 13])
      expect(gameTypes.findById(created.id)?.scoringMode).toBe('POINTS')
    })

    it('recounts the rounds won when the win condition flips in ROUNDS_WON', () => {
      const { matches, created, update } = setup('ROUNDS_WON')
      matches.save(match('m1', created.id, 2, 1))
      update.invoke({ ...created, winCondition: 'LOWEST_SCORE' })
      expect(scoresOf(matches, 'm1')).toEqual([1, 2])
    })

    it('goes back to points when the game becomes MANUAL', () => {
      const { matches, created, update } = setup('ROUNDS_WON')
      matches.save(match('m1', created.id, 2, 1))
      update.invoke({ ...created, winCondition: 'MANUAL' })
      expect(scoresOf(matches, 'm1')).toEqual([20, 13])
    })

    it('turns a match without round detail into a single round when switching to ROUNDS_WON', () => {
      // Skyjo: lowest wins. Alice (a) 40, Bob (b) 90, no detail.
      const { gameTypes, matches, created, update } = setup('POINTS')
      const skyjo = { ...created, winCondition: 'LOWEST_SCORE' as const }
      gameTypes.save(skyjo)
      matches.save(match('m1', created.id, 40, 90, []))
      update.invoke({ ...skyjo, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([1, 0])
      expect(matches.findById('m1')?.rounds).toEqual([
        [
          { playerId: 'a', score: 40 },
          { playerId: 'b', score: 90 },
        ],
      ])
    })

    it('leaves matches without round detail as they are when leaving ROUNDS_WON', () => {
      const { matches, created, update } = setup('ROUNDS_WON')
      matches.save(match('m1', created.id, 2, 1, []))
      update.invoke({ ...created, scoringMode: 'POINTS' })
      expect(scoresOf(matches, 'm1')).toEqual([2, 1])
      expect(matches.findById('m1')?.rounds).toEqual([])
    })

    it('never converts the matches without detail of a module-bound game', () => {
      const { matches, created, update } = setup('POINTS', 'tori-valley')
      matches.save(match('m1', created.id, 40, 90, []))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([40, 90])
      expect(matches.findById('m1')?.rounds).toEqual([])
    })

    it('writes the recomputed matches before the game type', () => {
      const { gameTypes, matches, created, update } = setup('POINTS')
      matches.save(match('m1', created.id, 20, 13))
      matches.saveAll = () => {
        throw new Error('quota')
      }
      expect(() => update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })).toThrow('quota')
      expect(gameTypes.findById(created.id)?.scoringMode).toBe('POINTS')
    })

    it('leaves matches whose detail disagrees with their scores as they are', () => {
      const { matches, created, update } = setup('POINTS')
      matches.save(match('m1', created.id, 50, 40))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([50, 40])
      expect(matches.findById('m1')?.rounds).toEqual(rawRounds)
    })

    it('keeps the tie-break data untouched', () => {
      const { matches, created, update } = setup('POINTS')
      const tieBreak = {
        manualWinners: ['a'],
        secondaryPlayerScores: [{ playerId: 'a', score: 4 }],
      }
      matches.save(match('m1', created.id, 20, 13, rawRounds, tieBreak))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(matches.findById('m1')).toMatchObject(tieBreak)
    })

    it('does not touch other games or a change that keeps the scoring', () => {
      const { matches, created, update } = setup('POINTS')
      matches.save(match('m1', 'another-game', 20, 13))
      matches.save(match('m2', created.id, 20, 13))
      update.invoke({ ...created, winCondition: 'LOWEST_SCORE', name: 'Renamed' })
      expect(scoresOf(matches, 'm2')).toEqual([20, 13])
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([20, 13])
    })
  })
})
