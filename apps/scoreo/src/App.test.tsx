import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'

function seedStatsData() {
  localStorage.setItem(
    'scoreo_players',
    JSON.stringify([
      { id: 'p1', name: 'Alice', active: true },
      { id: 'p2', name: 'Bob', active: true },
    ]),
  )
  localStorage.setItem(
    'scoreo_gametypes',
    JSON.stringify([
      {
        id: 'gt1',
        name: 'Test Game',
        winCondition: 'HIGHEST_SCORE',
        tieBreakRule: 'NONE',
        tieBreakCondition: 'HIGHEST_SCORE',
        tieBreakLabel: null,
        moduleId: null,
        active: true,
      },
    ]),
  )
  localStorage.setItem(
    'scoreo_matches',
    JSON.stringify([
      {
        id: 'm1',
        date: 1000,
        gameTypeId: 'gt1',
        playerScores: [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
        ],
        manualWinners: [],
        secondaryPlayerScores: [],
        rounds: [],
        moduleData: null,
      },
    ]),
  )
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/')
    localStorage.clear()
  })

  afterEach(() => {
    window.history.replaceState(null, '', '#/')
    localStorage.clear()
  })

  it('renders the app shell on Home with no back button', () => {
    render(<App />)
    expect(screen.getByText('Scoreo')).toBeInTheDocument()
    expect(screen.queryByLabelText('Back')).not.toBeInTheDocument()
  })

  it('burger menu navigates between screens and shows a back button that returns Home', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('History'))
    expect(screen.getByText('No matches yet.')).toBeInTheDocument()
    expect(screen.getByLabelText('Back')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Getting started')).toBeInTheDocument()
  })

  it('History: editing a match navigates to ScoreDetail with its parameters', () => {
    seedStatsData()
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('History'))
    expect(screen.getByText('Test Game', { selector: '.list-item-name' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Edit'))

    // The seeded id "m1" isn't a UUID, so LocalStorageMatchRepository's
    // v1->v2 migration regenerates it on first read — only the shape and
    // gameTypeId/playerIds are asserted here.
    expect(window.location.hash).toMatch(/^#\/score\/gt1\/p1,p2\/[0-9a-f-]{36}$/)
    expect(screen.getByText('Finish match')).toBeInTheDocument()

    fireEvent.click(screen.getByText('History', { selector: '.seg button' }))
    expect(document.querySelector('.hist-cell')).toHaveTextContent('Alice')
  })

  it('clicking the title navigates Home from any screen', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Games'))
    expect(screen.getByText('No game types yet. Add one.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Games', { selector: '.app-title' }))
    expect(screen.getByText('Getting started')).toBeInTheDocument()
  })

  it('Stats: back button navigates Home when the leaderboard is shown', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Stats'))
    expect(screen.getByText('No stats yet — play some matches first.')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Getting started')).toBeInTheDocument()
  })

  it('Stats: back button clears the player selection instead of navigating Home', () => {
    seedStatsData()
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Stats'))
    expect(screen.getByText('Alice')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Alice'))
    expect(screen.getByText('Head-to-head')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Head-to-head')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Alice', { selector: '.list-item-name' })).toBeInTheDocument()
  })

  it('Hall of Fame: burger menu navigates and shows the trophy cards', () => {
    seedStatsData()
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Hall of Fame'))

    expect(screen.getByText('The Invincible')).toBeInTheDocument()
    expect(screen.getByText('Current Streak')).toBeInTheDocument()
    expect(screen.getByText('Streak Breaker')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Scoreo')).toBeInTheDocument()
    expect(screen.queryByLabelText('Back')).not.toBeInTheDocument()
  })

  it('opens the theme picker from the burger menu', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Theme'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Flavor')).toBeInTheDocument()
  })

  it('shows the Sync unavailable message when no cloud sync repository is configured', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    expect(screen.queryByText('Sync')).not.toBeInTheDocument()

    act(() => {
      window.history.replaceState(null, '', '#/sync')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByText('Sync not available')).toBeInTheDocument()
  })

  // A module plays behind its own controls — the host's back arrow, title and
  // burger would only duplicate what it already draws.
  it('ModuleScore: renders without the host chrome, on its own route', () => {
    render(<App />)
    act(() => {
      window.history.replaceState(null, '', '#/module/not-installed/gt1/p1')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(screen.queryByText('Scoreo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Back')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Menu')).not.toBeInTheDocument()
    expect(screen.getByText('This module is not installed.')).toBeInTheDocument()

    act(() => {
      window.history.replaceState(null, '', '#/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByLabelText('Menu')).toBeInTheDocument()
  })
})
