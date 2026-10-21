import { describe, expect, it } from 'vitest'
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

    it('recomputes the matches of a module-bound game too', () => {
      const { matches, created, update } = setup('POINTS', 'tori-valley')
      matches.save(match('m1', created.id, 20, 13))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([2, 1])
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

    it('leaves matches without round detail as they are', () => {
      const { matches, created, update } = setup('POINTS')
      matches.save(match('m1', created.id, 20, 13, []))
      update.invoke({ ...created, scoringMode: 'ROUNDS_WON' })
      expect(scoresOf(matches, 'm1')).toEqual([20, 13])
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
