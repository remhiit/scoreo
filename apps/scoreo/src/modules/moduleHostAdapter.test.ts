import type { ModuleMatch } from '@scoreboards/module-api'
import { newGameType } from '@scoreboards/shared-domain'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const GAME_TYPE = newGameType('gt1', 'Torī Valley', 'HIGHEST_SCORE', { moduleId: 'tori-valley' })

function build() {
  const playerRepository = new InMemoryPlayerRepository()
  const matchRepository = new InMemoryMatchRepository()
  const draftRepository = new InMemoryModuleDraftRepository()
  const host = new ModuleHostAdapter(
    'tori-valley',
    GAME_TYPE,
    playerRepository,
    matchRepository,
    draftRepository,
    () => NOW,
  )
  return { host, playerRepository, matchRepository, draftRepository }
}

const result: ModuleMatch = {
  playerScores: [
    { playerId: 'p1', score: 9 },
    { playerId: 'p2', score: 5 },
  ],
  rounds: [
    [
      { playerId: 'p1', score: 9 },
      { playerId: 'p2', score: 5 },
    ],
  ],
  manualWinners: ['p1'],
  moduleData: null,
}

describe('ModuleHostAdapter', () => {
  describe('getPlayers', () => {
    it("hands over the host's players", () => {
      const { host, playerRepository } = build()
      playerRepository.save({ id: 'p1', name: 'Alice', active: true })

      expect(host.getPlayers()).toEqual([{ id: 'p1', name: 'Alice', active: true }])
    })

    // Reopening an old match still needs the names of everyone who played it.
    it('includes retired players', () => {
      const { host, playerRepository } = build()
      playerRepository.save({ id: 'p1', name: 'Alice', active: false })

      expect(host.getPlayers()).toEqual([{ id: 'p1', name: 'Alice', active: false }])
    })
  })

  it('exposes the game type the screen was opened for', () => {
    expect(build().host.gameType).toBe(GAME_TYPE)
  })

  describe('saveMatch', () => {
    it('stores the match against the game type the screen was opened for', () => {
      const { host, matchRepository } = build()

      const id = host.saveMatch(result)

      expect(matchRepository.findById(id)?.gameTypeId).toBe('gt1')
    })

    it('keeps the winners the module declared', () => {
      const { host, matchRepository } = build()

      const saved = matchRepository.findById(host.saveMatch(result))

      expect(saved?.manualWinners).toEqual(['p1'])
    })

    it('stores the whole match, with the fields the host owns filled in', () => {
      const { host, matchRepository } = build()

      const id = host.saveMatch({ ...result, date: 4242 })

      expect(matchRepository.findById(id)).toEqual({
        id,
        date: 4242,
        gameTypeId: 'gt1',
        playerScores: result.playerScores,
        manualWinners: ['p1'],
        secondaryPlayerScores: [],
        rounds: result.rounds,
        moduleData: null,
      })
    })

    it('mints a new id when the module gives none', () => {
      const { host } = build()

      expect(host.saveMatch(result)).not.toBe(host.saveMatch(result))
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

    // A match contradicting itself or its game's rules is a scoring bug:
    // storing it would leave a history disagreeing with its own total, and
    // nothing would ever notice again.
    describe('refuses, writing nothing', () => {
      const refused: Record<string, ModuleMatch> = {
        'rounds that do not sum to the scores': {
          ...result,
          playerScores: [{ playerId: 'p1', score: 10 }],
          rounds: [[{ playerId: 'p1', score: 4 }]],
          manualWinners: ['p1'],
        },
        'a player listed twice': {
          ...result,
          playerScores: [
            { playerId: 'p1', score: 9 },
            { playerId: 'p1', score: 9 },
          ],
          rounds: [],
        },
        'a round scoring a non-participant': {
          ...result,
          rounds: [
            [
              { playerId: 'p1', score: 9 },
              { playerId: 'ghost', score: 5 },
            ],
          ],
        },
        'a winner who did not play': { ...result, manualWinners: ['ghost'] },
      }

      for (const [name, match] of Object.entries(refused)) {
        it(name, () => {
          const { host, matchRepository, draftRepository } = build()
          host.saveDraft({ keep: 'me' })

          expect(() => host.saveMatch(match)).toThrow()
          expect(matchRepository.getAll()).toEqual([])
          expect(draftRepository.drafts.has('tori-valley')).toBe(true)
        })
      }
    })

    it('clears the draft once the match is stored', () => {
      const { host, draftRepository } = build()
      host.saveDraft({ dice: [1, 2] })

      host.saveMatch(result)

      expect(draftRepository.drafts.has('tori-valley')).toBe(false)
    })

    // Host code to host code, never surfaced to the module — lets whoever
    // built the adapter (ModuleScoreScreen) know a match was written.
    it('notifies onMatchSaved with the saved match id', () => {
      const playerRepository = new InMemoryPlayerRepository()
      const matchRepository = new InMemoryMatchRepository()
      const draftRepository = new InMemoryModuleDraftRepository()
      const onMatchSaved = vi.fn()
      const host = new ModuleHostAdapter(
        'tori-valley',
        GAME_TYPE,
        playerRepository,
        matchRepository,
        draftRepository,
        () => NOW,
        onMatchSaved,
      )

      const id = host.saveMatch(result)

      expect(onMatchSaved).toHaveBeenCalledWith(id)
    })

    describe('updating a match', () => {
      it('reuses the id instead of creating a second match', () => {
        const { host, matchRepository } = build()
        const first = host.saveMatch(result)

        const second = host.saveMatch({ ...result, id: first })

        expect(second).toBe(first)
        expect(matchRepository.getAll()).toHaveLength(1)
      })

      // Correcting a match keeps the evening it was played.
      it('keeps the original date', () => {
        const { host, matchRepository } = build()
        const id = host.saveMatch({ ...result, date: 1000 })

        host.saveMatch({ ...result, id })

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
        newGameType('gt2', 'Sabords', 'HIGHEST_SCORE', { moduleId: 'mille-sabords' }),
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
