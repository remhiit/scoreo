import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LANG_STORAGE_KEY } from './i18n/standalone'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '#/')
  })

  it('shows the Home screen by default', () => {
    render(<App />)
    expect(screen.getByText('Torī Valley')).toBeInTheDocument()
    expect(screen.getByText('No players yet — add some above.')).toBeInTheDocument()
  })

  it('navigates to History and back to Home', () => {
    render(<App />)
    fireEvent.click(screen.getByText('View history'))
    expect(screen.getByText('No matches recorded yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('No players yet — add some above.')).toBeInTheDocument()
  })

  it('adds a player, starts a match, and saves it into history', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('New player name'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(screen.getByText('Alice'))
    fireEvent.click(screen.getByText('Start match'))

    // Match setup sits between the player list and score entry.
    expect(screen.getByText('Objectif cards')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Bamboo variant C' }))
    fireEvent.click(screen.getByText('Start match'))

    expect(screen.getByText('Alice — 0 VP')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Save match'))

    expect(screen.getByText('Torī Valley')).toBeInTheDocument()
    fireEvent.click(screen.getByText('View history'))
    expect(screen.getByText('Alice 🏆')).toBeInTheDocument()
  })

  it('switches the UI to French and persists the choice', () => {
    render(<App />)
    expect(screen.getByText('Players')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } })

    expect(screen.getByText('Joueurs')).toBeInTheDocument()
    expect(
      screen.getByText('Aucun joueur pour le moment — ajoutez-en un ci-dessus.'),
    ).toBeInTheDocument()
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('fr')
  })

  it('shows a translated validation error in French', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } })

    fireEvent.click(screen.getByText('Ajouter'))

    expect(screen.getByText('Le nom du joueur ne peut pas être vide')).toBeInTheDocument()
  })

  it('carries the picked card variants into the saved match', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('New player name'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(screen.getByText('Alice'))
    fireEvent.click(screen.getByText('Start match'))

    fireEvent.click(screen.getByRole('radio', { name: 'Water variant B' }))
    fireEvent.click(screen.getByText('Start match'))
    fireEvent.click(screen.getByText('Save match'))

    const stored = JSON.parse(localStorage.getItem('tori_valley_matches') ?? '[]')
    expect(stored[0].objectifCards).toEqual({
      bamboo: 'A',
      cherryBlossom: 'A',
      mountain: 'A',
      water: 'B',
      village: 'A',
    })
  })

  it('going back from match setup keeps the player selected', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('New player name'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(screen.getByText('Alice'))
    fireEvent.click(screen.getByText('Start match'))

    fireEvent.click(screen.getByText('Back'))

    // Back on Home, Alice is still ticked, so the match can be restarted directly.
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
