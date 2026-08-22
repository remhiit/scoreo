import type { ModuleHost, ModuleMatchResult, ModulePlayer } from '@scoreboards/module-api'
import { assertRoundsSumToRanking } from '@scoreboards/module-api'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MODULE_DATA_VERSION, ToriValleyModuleDataSchema } from '../../domain/model/moduleResult'
import ToriValleyModuleScreen from './ToriValleyModuleScreen'

const PLAYERS: ModulePlayer[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

function fakeHost(players = PLAYERS) {
  const saved: ModuleMatchResult[] = []
  const host: ModuleHost = {
    getPlayers: () => players,
    saveMatch: (result) => {
      saved.push(result)
      return 'host-match-id'
    },
    loadDraft: () => undefined,
    saveDraft: () => {},
    clearDraft: () => {},
  }
  return { host, saved }
}

function renderScreen(overrides: Partial<Parameters<typeof ToriValleyModuleScreen>[0]> = {}) {
  const { host, saved } = fakeHost()
  const onExit = vi.fn()
  render(
    <ToriValleyModuleScreen host={host} playerIds={['p1', 'p2']} onExit={onExit} {...overrides} />,
  )
  return { saved, onExit }
}

/** The setup step deals the Objectif cards; the scoring grid comes after it. */
function confirmCards() {
  fireEvent.click(screen.getByText('Start match'))
}

describe('ToriValleyModuleScreen', () => {
  beforeEach(() => localStorage.clear())

  it('names the players the host handed it', () => {
    renderScreen()
    confirmCards()

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders nothing when the host gave it no players', () => {
    const { host } = fakeHost([])
    const { container } = render(
      <ToriValleyModuleScreen host={host} playerIds={[]} onExit={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('hands the finished match to the host, then leaves', () => {
    const { saved, onExit } = renderScreen()
    confirmCards()

    fireEvent.click(screen.getByText('Save match'))

    expect(saved).toHaveLength(1)
    expect(saved[0].ranking.map((e) => e.playerId).sort()).toEqual(['p1', 'p2'])
    expect(onExit).toHaveBeenCalled()
  })

  it('hands back a result whose rounds sum to its ranking', () => {
    const { saved } = renderScreen()
    confirmCards()
    fireEvent.click(screen.getByText('Save match'))

    expect(() => assertRoundsSumToRanking(saved[0])).not.toThrow()
  })

  // The host owns the storage: a hosted match must not leave a trace in the
  // module's own keys, or the same game would exist twice.
  it('writes nothing to the module’s own localStorage', () => {
    const { saved } = renderScreen()
    confirmCards()
    fireEvent.click(screen.getByText('Save match'))

    expect(saved).toHaveLength(1)
    expect(localStorage.length).toBe(0)
  })

  it('creates rather than updates when nothing is being reopened', () => {
    const { saved } = renderScreen()
    confirmCards()
    fireEvent.click(screen.getByText('Save match'))

    expect(saved[0]).not.toHaveProperty('matchId')
  })

  it('lets the host stamp the date', () => {
    const { saved } = renderScreen()
    confirmCards()
    fireEvent.click(screen.getByText('Save match'))

    expect(saved[0]).not.toHaveProperty('playedAt')
  })

  it('hands back its own state so the match can be reopened', () => {
    const { saved } = renderScreen()
    confirmCards()
    fireEvent.click(screen.getByText('Save match'))

    expect(saved[0].moduleData?.version).toBe(MODULE_DATA_VERSION)
    expect(ToriValleyModuleDataSchema.safeParse(saved[0].moduleData?.data).success).toBe(true)
  })

  describe('reopening a match', () => {
    const editing = {
      matchId: 'existing-match',
      version: MODULE_DATA_VERSION,
      data: {
        objectifCards: {
          bamboo: 'B',
          cherryBlossom: 'A',
          mountain: 'A',
          water: 'A',
          village: 'A',
        },
        results: [
          {
            playerId: 'p1',
            toriiCounts: { green: 0, red: 0, blue: 0, yellow: 0, purple: 0 },
            parcheminValue: 5,
            hasPinceau: false,
            objectifPoints: { bamboo: 0, cherryBlossom: 0, mountain: 0, water: 0, village: 0 },
            objectifInputs: {
              bamboo: {},
              cherryBlossom: {},
              mountain: {},
              water: {},
              village: {},
            },
            objectifManual: {
              bamboo: false,
              cherryBlossom: false,
              mountain: false,
              water: false,
              village: false,
            },
          },
        ],
      },
    }

    it('saves with the same id, so the host updates instead of duplicating', () => {
      const { saved } = renderScreen({ editing })
      confirmCards()
      fireEvent.click(screen.getByText('Save match'))

      expect(saved[0].matchId).toBe('existing-match')
    })

    it('restores the scores that were entered', () => {
      const { saved } = renderScreen({ editing })
      confirmCards()
      fireEvent.click(screen.getByText('Save match'))

      const alice = saved[0].ranking.find((e) => e.playerId === 'p1')
      expect(alice?.score).toBe(5)
    })

    // The host stores the payload without ever reading it, so the module is the
    // only side that can notice it is unusable.
    it('starts a fresh grid on an unreadable payload rather than crashing', () => {
      const { saved } = renderScreen({
        editing: { matchId: 'existing-match', version: 1, data: { nonsense: true } },
      })
      confirmCards()
      fireEvent.click(screen.getByText('Save match'))

      expect(saved[0].ranking.every((e) => e.score === 0)).toBe(true)
    })
  })
})
