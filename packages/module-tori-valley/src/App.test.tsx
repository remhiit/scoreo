import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
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

    expect(screen.getByText('Alice — 0 VP')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Save match'))

    expect(screen.getByText('Torī Valley')).toBeInTheDocument()
    fireEvent.click(screen.getByText('View history'))
    expect(screen.getByText('Alice 🏆')).toBeInTheDocument()
  })
})
