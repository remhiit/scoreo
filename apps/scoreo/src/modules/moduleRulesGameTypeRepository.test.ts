import { describe, expect, it } from 'vitest'
import { newGameType } from '../domain/model/gameType'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { ModuleRulesGameTypeRepository } from './moduleRulesGameTypeRepository'

function setup() {
  const raw = new InMemoryGameTypeRepository()
  raw.save(newGameType('s', 'Skyjo', 'HIGHEST_SCORE', { moduleId: 'skyjo' }))
  raw.save(newGameType('b', 'Belote', 'HIGHEST_SCORE'))
  return { raw, repo: new ModuleRulesGameTypeRepository(raw) }
}

describe('ModuleRulesGameTypeRepository', () => {
  it('resolves module rules in getAll and findById', () => {
    const { repo } = setup()
    expect(repo.findById('s')).toMatchObject({
      winCondition: 'LOWEST_SCORE',
      minPlayers: 2,
      maxPlayers: 8,
      tieBreakRule: 'MANUAL_SELECTION',
    })
    const all = repo.getAll(true)
    expect(all.find((g) => g.id === 's')?.winCondition).toBe('LOWEST_SCORE')
    expect(all.find((g) => g.id === 'b')?.tieBreakRule).toBe('NONE')
  })

  it('does not rewrite what is stored when reading', () => {
    const { raw, repo } = setup()
    repo.getAll(true)
    repo.findById('s')
    expect(raw.findById('s')).toMatchObject({ winCondition: 'HIGHEST_SCORE', minPlayers: null })
  })

  it('writes through to the raw repository', () => {
    const { raw, repo } = setup()
    repo.save(newGameType('n', 'Nouveau', 'LOWEST_SCORE'))
    repo.hardDelete('b')
    expect(raw.findById('n')?.name).toBe('Nouveau')
    expect(raw.findById('b')).toBeUndefined()
  })
})
