import { describe, expect, it } from 'vitest'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { createServices } from './createServices'

describe('createServices', () => {
  it('uses the provided overrides instead of the localStorage defaults', () => {
    const playerRepository = new InMemoryPlayerRepository()
    const matchRepository = new InMemoryMatchRepository()
    const currentDate = () => 42

    const services = createServices({ playerRepository, matchRepository, currentDate })

    expect(services.playerRepository).toBe(playerRepository)
    expect(services.matchRepository).toBe(matchRepository)
    expect(services.currentDate()).toBe(42)
  })

  it('falls back to localStorage-backed repositories by default', () => {
    const services = createServices()
    expect(services.playerRepository).toBeDefined()
    expect(services.matchRepository).toBeDefined()
  })
})
