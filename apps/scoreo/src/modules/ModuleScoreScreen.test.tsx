import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Match } from '../domain/model/match'
import { createServices } from '../services/createServices'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { ModuleScoreScreen } from './ModuleScoreScreen'
import { resolveEditing } from './resolveEditing'

// A minimal fake module: saves on click (like a real module would after
// scoring), exits separately — the two are never the same call in practice.
function FakeModuleScreen({ host, onExit }: ScoringModuleScreenProps) {
  return (
    <div>
      <button onClick={() => host.saveMatch({ ranking: [{ playerId: 'p1', score: 1, rank: 1 }] })}>
        Save
      </button>
      <button onClick={onExit}>Exit</button>
    </div>
  )
}

vi.mock('./registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./registry')>()
  return {
    ...actual,
    findModule: (moduleId: string) =>
      moduleId === 'fake'
        ? {
            manifest: {
              moduleId: 'fake',
              displayName: 'Fake',
              gameNames: ['Fake'],
              winCondition: 'HIGHEST_SCORE',
              minPlayers: 1,
              maxPlayers: 4,
              dataVersion: 1,
            },
            load: () => Promise.resolve({ default: FakeModuleScreen }),
          }
        : actual.findModule(moduleId),
  }
})

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

  function renderFakeModule(onExit = vi.fn()) {
    const services = createServices({
      playerRepository: new InMemoryPlayerRepository(),
      gameTypeRepository: new InMemoryGameTypeRepository(),
      matchRepository: new InMemoryMatchRepository(),
    })

    render(
      <ModuleScoreScreen
        screen={{ type: 'ModuleScore', moduleId: 'fake', gameTypeId: 'gt1', playerIds: ['p1'] }}
        services={services}
        onExit={onExit}
      />,
    )

    return { onExit }
  }

  // The module's own onExit stays () => void per the contract; ModuleScoreScreen
  // is the one that hands the id up to the host.
  it('passes the id of the match saved during the session to onExit', async () => {
    const { onExit } = renderFakeModule()

    fireEvent.click(await screen.findByText('Save'))
    fireEvent.click(screen.getByText('Exit'))

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledWith(expect.any(String))
  })

  it('passes undefined to onExit when nothing was saved this session', async () => {
    const { onExit } = renderFakeModule()

    fireEvent.click(await screen.findByText('Exit'))

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledWith(undefined)
  })

})
