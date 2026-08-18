import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultObjectifCardSelection } from '../../domain/model/landscape'
import { MatchSetupScreen } from './MatchSetupScreen'

function renderScreen(initialSelection?: ReturnType<typeof defaultObjectifCardSelection>) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <MatchSetupScreen
      playerIds={['p1', 'p2']}
      initialSelection={initialSelection}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  return { onConfirm, onCancel }
}

describe('MatchSetupScreen', () => {
  it('shows one row per landscape', () => {
    renderScreen()

    for (const label of ['Bamboo', 'Cherry Blossom', 'Mountain', 'Water', 'Village']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows the Torī card as always in play, with no variant to pick', () => {
    renderScreen()

    expect(screen.getByText(/Torī/)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Torī variant A' })).not.toBeInTheDocument()
  })

  it('defaults every landscape to variant A so the screen is valid on arrival', () => {
    renderScreen()

    expect(screen.getByRole('radio', { name: 'Bamboo variant A' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Village variant A' })).toBeChecked()
  })

  it('confirms straight away with the default selection', () => {
    const { onConfirm } = renderScreen()

    fireEvent.click(screen.getByText('Start match'))

    expect(onConfirm).toHaveBeenCalledWith(defaultObjectifCardSelection())
  })

  it('confirms with the variants the user picked', () => {
    const { onConfirm } = renderScreen()

    fireEvent.click(screen.getByRole('radio', { name: 'Bamboo variant C' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Water variant B' }))
    fireEvent.click(screen.getByText('Start match'))

    expect(onConfirm).toHaveBeenCalledWith({
      ...defaultObjectifCardSelection(),
      bamboo: 'C',
      water: 'B',
    })
  })

  it('picking a second variant for the same landscape replaces the first', () => {
    const { onConfirm } = renderScreen()

    fireEvent.click(screen.getByRole('radio', { name: 'Mountain variant B' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mountain variant C' }))
    fireEvent.click(screen.getByText('Start match'))

    expect(onConfirm).toHaveBeenCalledWith({ ...defaultObjectifCardSelection(), mountain: 'C' })
  })

  it('pre-checks the variants of a match being edited', () => {
    renderScreen({ ...defaultObjectifCardSelection(), cherryBlossom: 'B' })

    expect(screen.getByRole('radio', { name: 'Cherry Blossom variant B' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Cherry Blossom variant A' })).not.toBeChecked()
  })

  it('cancels back to the player list', () => {
    const { onCancel } = renderScreen()

    fireEvent.click(screen.getByText('Back'))

    expect(onCancel).toHaveBeenCalled()
  })
})
