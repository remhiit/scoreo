import type { ModuleMatchResult } from '@scoreboards/module-api'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ModuleDraftRepository } from '../domain/port/moduleDraftRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { ModuleHostAdapter } from './moduleHostAdapter'

class InMemoryModuleDraftRepository implements ModuleDraftRepository {
  readonly drafts = new Map<string, unknown>()
  load(moduleId: string) {
    return this.drafts.get(moduleId)
  }
  save(moduleId: string, state: unknown) {
    this.drafts.set(moduleId, state)
  }
  clear(moduleId: string) {
    this.drafts.delete(moduleId)
  }
}

const NOW = 1767225600000

function build() {
  const playerRepository = new InMemoryPlayerRepository()
  const matchRepository = new InMemoryMatchRepository()
  const draftRepository = new InMemoryModuleDraftRepository()
  const host = new ModuleHostAdapter(
    'tori-valley',
    'gt1',
    playerRepository,
    matchRepository,
    draftRepository,
    () => NOW,
  )
  return { host, playerRepository, matchRepository, draftRepository }
}

const result: ModuleMatchResult = {
  ranking: [
    { playerId: 'p1', score: 9, rank: 1 },
    { playerId: 'p2', score: 5, rank: 2 },
  ],
  rounds: [
    {
      label: 'bamboo',
      scores: [
        { playerId: 'p1', score: 9 },
        { playerId: 'p2', score: 5 },
      ],
    },
  ],
}

describe('ModuleHostAdapter', () => {
  describe('getPlayers', () => {
    it('hands over id and name only', () => {
      const { host, playerRepository } = build()
      playerRepository.save({ id: 'p1', name: 'Alice', active: true })

      expect(host.getPlayers()).toEqual([{ id: 'p1', name: 'Alice' }])
    })

    // Reopening an old match still needs the names of everyone who played it.
    it('includes retired players', () => {
      const { host, playerRepository } = build()
      playerRepository.save({ id: 'p1', name: 'Alice', active: false })

      expect(host.getPlayers()).toEqual([{ id: 'p1', name: 'Alice' }])
    })
  })

  describe('saveMatch', () => {
    it('stores the match against the game type the screen was opened for', () => {
      const { host, matchRepository } = build()

      const id = host.saveMatch(result)

      expect(matchRepository.findById(id)?.gameTypeId).toBe('gt1')
    })

    it('takes the winners from the announced rank', () => {
      const { host, matchRepository } = build()

      const saved = matchRepository.findById(host.saveMatch(result))

      expect(saved?.manualWinners).toEqual(['p1'])
    })

    it('keeps the round detail', () => {
      const { host, matchRepository } = build()

      const saved = matchRepository.findById(host.saveMatch(result))

      expect(saved?.rounds).toEqual([
        [
          { playerId: 'p1', score: 9 },
          { playerId: 'p2', score: 5 },
        ],
      ])
    })

    it('stamps its own clock when the module gives no date', () => {
      const { host, matchRepository } = build()

      expect(matchRepository.findById(host.saveMatch(result))?.date).toBe(NOW)
    })

    it('stamps the payload with the module it came from', () => {
      const { host, matchRepository } = build()

      const saved = matchRepository.findById(
        host.saveMatch({ ...result, moduleData: { version: 3, data: { grid: 'anything' } } }),
      )

      expect(saved?.moduleData).toEqual({
        moduleId: 'tori-valley',
        version: 3,
        data: { grid: 'anything' },
      })
    })

    it('stores no payload when the module hands none', () => {
      const { host, matchRepository } = build()

      expect(matchRepository.findById(host.saveMatch(result))?.moduleData).toBeNull()
    })

    // Round detail contradicting the announced scores is a scoring bug: storing
    // it would leave a match whose history disagrees with its own total, and
    // nothing would ever notice again.
    it('refuses a result whose rounds do not sum to its ranking', () => {
      const { host, matchRepository } = build()

      expect(() =>
        host.saveMatch({
          ranking: [{ playerId: 'p1', score: 10, rank: 1 }],
          rounds: [{ label: 'bamboo', scores: [{ playerId: 'p1', score: 4 }] }],
        }),
      ).toThrow()
      expect(matchRepository.getAll()).toEqual([])
    })

    it('clears the draft once the match is stored', () => {
      const { host, draftRepository } = build()
      host.saveDraft({ dice: [1, 2] })

      host.saveMatch(result)

      expect(draftRepository.drafts.has('tori-valley')).toBe(false)
    })

    describe('updating a match', () => {
      it('reuses the id instead of creating a second match', () => {
        const { host, matchRepository } = build()
        const first = host.saveMatch(result)

        const second = host.saveMatch({ ...result, matchId: first })

        expect(second).toBe(first)
        expect(matchRepository.getAll()).toHaveLength(1)
      })

      // Correcting a match keeps the evening it was played.
      it('keeps the original date', () => {
        const { host, matchRepository } = build()
        const id = host.saveMatch({ ...result, playedAt: 1000 })

        host.saveMatch({ ...result, matchId: id })

        expect(matchRepository.findById(id)?.date).toBe(1000)
      })
    })
  })

  describe('drafts', () => {
    beforeEach(() => localStorage.clear())

    it('round-trips a draft', () => {
      const { host } = build()
      host.saveDraft({ dice: [1, 2, 3] })

      expect(host.loadDraft()).toEqual({ dice: [1, 2, 3] })
    })

    it('has none to start with', () => {
      expect(build().host.loadDraft()).toBeUndefined()
    })

    it('clears on request', () => {
      const { host } = build()
      host.saveDraft({ dice: [1] })

      host.clearDraft()

      expect(host.loadDraft()).toBeUndefined()
    })

    // Two modules must never overwrite each other's turn in progress.
    it('keeps each module’s draft to itself', () => {
      const { host, playerRepository, matchRepository, draftRepository } = build()
      const other = new ModuleHostAdapter(
        'mille-sabords',
        'gt2',
        playerRepository,
        matchRepository,
        draftRepository,
        () => NOW,
      )

      host.saveDraft({ from: 'tori' })
      other.saveDraft({ from: 'sabords' })

      expect(host.loadDraft()).toEqual({ from: 'tori' })
      expect(other.loadDraft()).toEqual({ from: 'sabords' })
    })
  })
})
