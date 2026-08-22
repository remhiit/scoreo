import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Match } from '../domain/model/match'
import { createServices } from '../services/createServices'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { ModuleScoreScreen } from './ModuleScoreScreen'
import { resolveEditing } from './resolveEditing'

function match(moduleData: Match['moduleData']): Match {
  return {
    id: 'm1',
    date: 1000,
    gameTypeId: 'gt1',
    playerScores: [],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [],
    moduleData,
  }
}

describe('resolveEditing', () => {
  it('hands the module back its own payload', () => {
    const stored = match({ moduleId: 'tori-valley', version: 2, data: { grid: 1 } })

    expect(resolveEditing(stored, 'tori-valley')).toEqual({
      matchId: 'm1',
      version: 2,
      data: { grid: 1 },
    })
  })

  // Handing one module another's payload would at best show a blank grid and at
  // worst overwrite a match with something it never scored.
  it('hands over nothing when the match belongs to another module', () => {
    const stored = match({ moduleId: 'mille-sabords', version: 1, data: {} })

    expect(resolveEditing(stored, 'tori-valley')).toBeUndefined()
  })

  it('hands over nothing for a match Scoreo scored itself', () => {
    expect(resolveEditing(match(null), 'tori-valley')).toBeUndefined()
  })

  it('hands over nothing when the match does not exist', () => {
    expect(resolveEditing(undefined, 'tori-valley')).toBeUndefined()
  })
})

describe('ModuleScoreScreen', () => {
  it('says so rather than crashing when the module is not installed', () => {
    const services = createServices({
      playerRepository: new InMemoryPlayerRepository(),
      gameTypeRepository: new InMemoryGameTypeRepository(),
      matchRepository: new InMemoryMatchRepository(),
    })

    render(
      <ModuleScoreScreen
        screen={{
          type: 'ModuleScore',
          moduleId: 'not-installed',
          gameTypeId: 'gt1',
          playerIds: ['p1'],
        }}
        services={services}
        onExit={() => {}}
      />,
    )

    expect(screen.getByText('This module is not installed.')).toBeInTheDocument()
  })
})
