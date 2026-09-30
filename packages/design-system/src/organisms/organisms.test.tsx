import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppHeader } from './AppHeader'
import { Banner } from './Banner'
import { Dialog } from './Dialog'
import { DropZone } from './DropZone'
import { Sheet, SheetRow } from './Sheet'
import { SideMenu } from './SideMenu'
import { ThemePicker } from './ThemePicker'

describe('AppHeader', () => {
  it('renders back, title and menu', () => {
    const onBack = vi.fn()
    const onMenu = vi.fn()
    render(
      <AppHeader
        title="Skyjo"
        back={{ label: 'Back', onClick: onBack }}
        menu={{ label: 'Menu', onClick: onMenu }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Skyjo' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onMenu).toHaveBeenCalledOnce()
  })
})

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} title="Delete match?">
        body
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is named by its title and closes on Escape and scrim click', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Delete match?" onClose={onClose} actions={<button>Delete</button>}>
        This match will be lost.
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Delete match?' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('does not close when clicking inside', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="T" onClose={onClose}>
        inside
      </Dialog>,
    )
    fireEvent.click(screen.getByText('inside'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('Sheet', () => {
  it('renders its rows and actions and closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Sheet open title="Round 4" onClose={onClose} actions={<button>Save round</button>}>
        <SheetRow name="Léa" meta={16}>
          <input aria-label="Léa" />
        </SheetRow>
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Round 4' })).toBeInTheDocument()
    expect(screen.getByText(/· 16/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('SideMenu', () => {
  it('lists its items and closes', () => {
    const onClose = vi.fn()
    const onStats = vi.fn()
    render(
      <SideMenu
        open
        closeLabel="Close"
        onClose={onClose}
        items={[{ icon: 'stats', label: 'Stats', onClick: onStats }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Stats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onStats).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('Banner', () => {
  it('renders steps and a single action', () => {
    const onResume = vi.fn()
    render(
      <Banner
        title="Getting started"
        steps={['Add players', 'Create a game type']}
        action={{ label: 'Resume', icon: 'play', onClick: onResume }}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(onResume).toHaveBeenCalledOnce()
  })
})

describe('DropZone', () => {
  it('hands the chosen file back', () => {
    const onFile = vi.fn()
    render(<DropZone label="Choose a JSON file" accept=".json" onFile={onFile} />)
    const file = new File(['{}'], 'scores.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Choose a JSON file'), { target: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })
})

describe('ThemePicker', () => {
  it('reports flavor and accent choices', () => {
    const onFlavor = vi.fn()
    const onAccent = vi.fn()
    render(
      <ThemePicker
        flavorLabel="Flavor"
        accentLabel="Accent"
        flavors={[
          { value: 'latte', label: 'Latte' },
          { value: 'mocha', label: 'Mocha' },
        ]}
        flavor="latte"
        onFlavorChange={onFlavor}
        accents={[
          { value: 'mauve', label: 'Mauve' },
          { value: 'blue', label: 'Blue' },
        ]}
        accent="mauve"
        onAccentChange={onAccent}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mocha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Blue' }))
    expect(onFlavor).toHaveBeenCalledWith('mocha')
    expect(onAccent).toHaveBeenCalledWith('blue')
  })
})
