import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetTrophiesUseCase, REGULAR_MIN_MATCHES } from '../../application/getTrophiesUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import i18n from '../../i18n/i18n'
import { HallOfFameScreen } from './HallOfFameScreen'

function player(id: string, name: string): Player {
  return { id, name, active: true }
}

function gameType(id: string, name: string): GameType {
  return {
    id,
    name,
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    active: true,
  }
}

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores']): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [] }
}

function renderHallOfFame() {
  const playerRepo = new InMemoryPlayerRepository()
  playerRepo.save(player('p1', 'Alice'))
  playerRepo.save(player('p2', 'Bob'))
  const gameTypeRepo = new InMemoryGameTypeRepository()
  gameTypeRepo.save(gameType('gt1', 'Chess'))
  gameTypeRepo.save(gameType('gt2', 'Darts'))
  const matchRepo = new InMemoryMatchRepository()
  matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
  matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
  matchRepo.save(match('m3', 3000, 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
  const getTrophies = new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo)
  const getGameTypes = new GetGameTypesUseCase(gameTypeRepo)
  return render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)
}

describe('HallOfFameScreen', () => {
  it('shows one card per trophy with title, description, and holder', () => {
    renderHallOfFame()

    expect(screen.getByText('The Invincible')).toBeInTheDocument()
    expect(screen.getByText('Current Streak')).toBeInTheDocument()
    expect(screen.getByText('Streak Breaker')).toBeInTheDocument()
    expect(screen.getByText('The Collector')).toBeInTheDocument()
    expect(screen.getByText('The Regular')).toBeInTheDocument()
    expect(screen.getByText('The Peak')).toBeInTheDocument()
    expect(screen.getByText('King of the Hill')).toBeInTheDocument()
    expect(screen.getByText('Game Record')).toBeInTheDocument()
    expect(screen.getByText('Nemesis')).toBeInTheDocument()
    expect(screen.getByText('Player of the Month')).toBeInTheDocument()
    expect(screen.getByText('Monthly Champions')).toBeInTheDocument()
    expect(screen.getByText('Longest winning streak of all time')).toBeInTheDocument()
    // Alice: The Invincible (2-win streak) + The Collector (2 wins) + The Peak + King of the Hill + Game Record (Chess, 10) + Monthly Champions.
    expect(screen.getAllByText('Alice')).toHaveLength(6)
    // Bob: Current Streak + Streak Breaker holder + Game Record (Darts, 10).
    expect(screen.getAllByText('Bob')).toHaveLength(3)
  })

  it('renders a threshold-interpolated description and a structured holder detail', () => {
    renderHallOfFame()

    // B3's description interpolates REGULAR_MIN_MATCHES rather than hardcoding it.
    expect(screen.getByText(`Best win ratio, among players with at least ${REGULAR_MIN_MATCHES} matches`)).toBeInTheDocument()
    // A4's detail is built from structured data (kind: 'streakBroken') via i18n, not a pre-assembled sentence.
    expect(screen.getByText("Ended Alice's streak")).toBeInTheDocument()
  })

  it('shows an explicit empty state when a trophy has no holders', () => {
    const getTrophies = new GetTrophiesUseCase(
      new InMemoryMatchRepository(),
      new InMemoryGameTypeRepository(),
      new InMemoryPlayerRepository(),
    )
    const getGameTypes = new GetGameTypesUseCase(new InMemoryGameTypeRepository())
    render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)

    expect(screen.getAllByText('No record yet.')).toHaveLength(11)
  })

  it('filters trophies by game type', () => {
    renderHallOfFame()

    expect(screen.getByRole('button', { name: 'Chess' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Darts' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Darts' }))

    // On gt2 only, Bob holds The Invincible, Current Streak, The Collector, The Peak, King of the Hill, Game Record, and Monthly Champions.
    expect(screen.getAllByText('Bob')).toHaveLength(7)
  })

  it('defaults to the "All" filter', () => {
    renderHallOfFame()

    expect(screen.getByText('All').className).toContain('active')
  })

  it('updates the tab label and empty state immediately when the language changes', async () => {
    const getTrophies = new GetTrophiesUseCase(
      new InMemoryMatchRepository(),
      new InMemoryGameTypeRepository(),
      new InMemoryPlayerRepository(),
    )
    const getGameTypes = new GetGameTypesUseCase(new InMemoryGameTypeRepository())
    render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText('No record yet.').length).toBeGreaterThan(0)

    await i18n.changeLanguage('fr')

    expect(screen.getByText('Tous')).toBeInTheDocument()
    expect(screen.queryByText('All')).not.toBeInTheDocument()
    expect(screen.getAllByText('Aucun record pour l\'instant.').length).toBeGreaterThan(0)
    expect(screen.queryByText('No record yet.')).not.toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})

describe('HallOfFameScreen — F3 Monthly Champions grouping', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('groups f3 holders by month, most recent first, each under its own subtitle', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Chess'))
    const matchRepo = new InMemoryMatchRepository()
    // June 2026: Bob wins.
    matchRepo.save(match('m1', new Date(2026, 5, 5).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
    // July 2026: Alice wins.
    matchRepo.save(match('m2', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    const getTrophies = new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo)
    const getGameTypes = new GetGameTypesUseCase(gameTypeRepo)

    render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)

    const julySubtitle = screen.getByText('July 2026')
    const juneSubtitle = screen.getByText('June 2026')
    expect(julySubtitle).toBeInTheDocument()
    expect(juneSubtitle).toBeInTheDocument()
    // July (most recent) is rendered before June.
    expect(julySubtitle.compareDocumentPosition(juneSubtitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('gives each month group a distinct React key, even for the same player winning twice', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Chess'))
    const matchRepo = new InMemoryMatchRepository()
    // June 2026: Alice wins.
    matchRepo.save(match('m1', new Date(2026, 5, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    // July 2026: Alice wins again.
    matchRepo.save(match('m2', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    const getTrophies = new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo)
    const getGameTypes = new GetGameTypesUseCase(gameTypeRepo)

    render(<HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />)

    expect(screen.getByText('June 2026')).toBeInTheDocument()
    expect(screen.getByText('July 2026')).toBeInTheDocument()
    // Alice appears once per month group, no React key collision hiding a row.
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(2)
  })
})
