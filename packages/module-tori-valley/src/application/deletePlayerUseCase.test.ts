import { describe, expect, it } from 'vitest'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { AddPlayerUseCase } from './addPlayerUseCase'
import { DeletePlayerUseCase } from './deletePlayerUseCase'

describe('DeletePlayerUseCase', () => {
  it('deactivates the player instead of removing it', () => {
    const repo = new InMemoryPlayerRepository()
    const player = new AddPlayerUseCase(repo).invoke('Alice')

    new DeletePlayerUseCase(repo).invoke(player.id)

    expect(repo.getAll()).toHaveLength(0)
    expect(repo.getAll(true)).toHaveLength(1)
    expect(repo.getAll(true)[0].active).toBe(false)
  })

  it('keeps the name unless anonymize is requested', () => {
    const repo = new InMemoryPlayerRepository()
    const player = new AddPlayerUseCase(repo).invoke('Alice')

    new DeletePlayerUseCase(repo).invoke(player.id, true)

    expect(repo.getAll(true)[0].name).toBe('')
  })
})
