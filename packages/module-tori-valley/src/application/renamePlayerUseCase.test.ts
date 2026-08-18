import { describe, expect, it } from 'vitest'
import { NotFoundError, ValidationError } from '../domain/model/errors'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { AddPlayerUseCase } from './addPlayerUseCase'
import { RenamePlayerUseCase } from './renamePlayerUseCase'

describe('RenamePlayerUseCase', () => {
  it('renames an existing player', () => {
    const repo = new InMemoryPlayerRepository()
    const player = new AddPlayerUseCase(repo).invoke('Alice')

    new RenamePlayerUseCase(repo).invoke(player.id, 'Alicia')

    expect(repo.getAll()[0].name).toBe('Alicia')
  })

  it('throws when the player does not exist', () => {
    const repo = new InMemoryPlayerRepository()
    expect(() => new RenamePlayerUseCase(repo).invoke('missing', 'X')).toThrow(NotFoundError)
  })

  it('rejects a blank name', () => {
    const repo = new InMemoryPlayerRepository()
    const player = new AddPlayerUseCase(repo).invoke('Alice')

    expect(() => new RenamePlayerUseCase(repo).invoke(player.id, '  ')).toThrow(ValidationError)
  })
})
