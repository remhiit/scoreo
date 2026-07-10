import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '#/')
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
    expect(screen.getByText('History (placeholder)')).toBeInTheDocument()
    expect(screen.getByLabelText('Back')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Home (placeholder)')).toBeInTheDocument()
  })

  it('clicking the title navigates Home from any screen', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Games'))
    expect(screen.getByText('Games (placeholder)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Games'))
    expect(screen.getByText('Home (placeholder)')).toBeInTheDocument()
  })

  it('Stats back button clears the selection instead of navigating Home when a player is selected', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Stats'))
    fireEvent.click(screen.getByText(/select a player/))
    expect(screen.getByText('Stats: player detail (placeholder)')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText(/select a player/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Home (placeholder)')).toBeInTheDocument()
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
    expect(screen.getByText('☁ Sync not available')).toBeInTheDocument()
  })
})
