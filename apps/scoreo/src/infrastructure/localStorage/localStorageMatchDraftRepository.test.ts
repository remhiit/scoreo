import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageMatchDraftRepository } from './localStorageMatchDraftRepository'

describe('LocalStorageMatchDraftRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns undefined when nothing saved', () => {
    const repo = new LocalStorageMatchDraftRepository()
    expect(repo.load()).toBeUndefined()
  })

  it('round-trips a saved draft', () => {
    const repo = new LocalStorageMatchDraftRepository()
    repo.save({
      gameTypeId: 'gt1',
      playerIds: ['alice', 'bob'],
      rounds: [{ alice: '10', bob: '5' }],
      updatedAt: 1000,
      moduleState: null,
    })

    expect(repo.load()).toEqual({
      gameTypeId: 'gt1',
      playerIds: ['alice', 'bob'],
      rounds: [{ alice: '10', bob: '5' }],
      updatedAt: 1000,
      moduleState: null,
    })
  })

  it('round-trips a draft carrying a module state', () => {
    const repo = new LocalStorageMatchDraftRepository()
    const draft = {
      gameTypeId: 'gt1',
      playerIds: ['alice'],
      rounds: [],
      updatedAt: 1000,
      moduleState: { moduleId: 'skyjo', state: { turn: 3 } },
    }
    repo.save(draft)

    expect(repo.load()).toEqual(draft)
  })

  it('reads a draft stored before moduleState existed with a null moduleState', () => {
    localStorage.setItem(
      'scoreo_match_draft',
      JSON.stringify({ gameTypeId: 'gt1', playerIds: ['alice'], rounds: [], updatedAt: 1000 }),
    )

    expect(new LocalStorageMatchDraftRepository().load()?.moduleState).toBeNull()
  })

  it('clear removes the draft', () => {
    const repo = new LocalStorageMatchDraftRepository()
    repo.save({
      gameTypeId: 'gt1',
      playerIds: ['alice'],
      rounds: [],
      updatedAt: 1000,
      moduleState: null,
    })

    repo.clear()

    expect(repo.load()).toBeUndefined()
  })

  it('fails open on corrupted JSON (returns undefined)', () => {
    localStorage.setItem('scoreo_match_draft', 'not json')
    const repo = new LocalStorageMatchDraftRepository()

    expect(repo.load()).toBeUndefined()
  })
})
