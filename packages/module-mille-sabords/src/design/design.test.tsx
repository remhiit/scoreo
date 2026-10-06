// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DieCounter } from './DieCounter'
import { GameColumn, GameColumns } from './GameColumns'
import { ModuleRoot } from './ModuleRoot'
import { ScorePreview } from './ScorePreview'
import { ScoreTable } from './ScoreTable'

afterEach(cleanup)

describe('ModuleRoot', () => {
  it('carries the scope every game-piece rule hangs from', () => {
    const { container } = render(<ModuleRoot>partie</ModuleRoot>)
    expect((container.firstChild as HTMLElement).className).toBe('module-mille-sabords')
  })
})

describe('GameColumns', () => {
  it('names each column as a landmark', () => {
    render(
      <GameColumns>
        <GameColumn label="Tableau de bord">grille</GameColumn>
      </GameColumns>,
    )
    expect(screen.getByRole('region', { name: 'Tableau de bord' }).textContent).toBe('grille')
  })
})

describe('DieCounter', () => {
  it('reads the count out and steps it both ways', () => {
    const onDecrease = vi.fn()
    const onIncrease = vi.fn()
    render(
      <DieCounter
        face="💎"
        label="Diamant"
        count={3}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
      />,
    )

    expect(screen.getByLabelText('Diamant : compteur').textContent).toBe('3')
    fireEvent.click(screen.getByRole('button', { name: 'Retirer un Diamant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un Diamant' }))
    expect(onDecrease).toHaveBeenCalledOnce()
    expect(onIncrease).toHaveBeenCalledOnce()
  })
})

describe('ScorePreview', () => {
  it('colours the score by its tone and keeps the breakdown', () => {
    render(<ScorePreview score="-200 pts" tone="negative" details={'Crânes\nPerdu'} />)
    expect(screen.getByText('-200 pts').className).toBe(
      'ms-preview__score ms-preview__score--negative',
    )
    expect(screen.getByText(/Crânes/).textContent).toBe('Crânes\nPerdu')
  })
})

describe('ScoreTable', () => {
  const players = [
    { key: 'p1', name: 'Anne' },
    { key: 'p2', name: 'Mary' },
  ]

  it('marks the player on turn and tones each cell and total', () => {
    render(
      <ScoreTable
        cornerLabel="Tour"
        players={players}
        currentIndex={1}
        rounds={[
          {
            label: 'Tour 1',
            cells: [
              { text: '0', tone: 'zero' },
              { text: '☠️ (-400)', tone: 'island', title: '4 crânes' },
            ],
          },
        ]}
        emptyLabel="Aucun coup"
        totalLabel="Total"
        totals={[
          { value: 6100, tone: 'over' },
          { value: 0, tone: 'default' },
        ]}
      />,
    )

    const mary = screen.getByRole('columnheader', { name: 'Mary' })
    expect(mary.className).toBe('ms-current')
    expect(mary.getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('columnheader', { name: 'Anne' }).className).toBe('')
    expect(screen.getByText('0', { selector: 'tbody td' }).className).toBe('ms-cell ms-cell--zero')
    expect(screen.getByTitle('4 crânes').className).toBe('ms-cell ms-cell--island')
    expect(screen.getByText('6100').className).toBe('ms-total ms-total--over')
    expect(screen.queryByText('Aucun coup')).toBeNull()
  })

  it('says so across the whole grid while nobody has played', () => {
    render(
      <ScoreTable
        cornerLabel="Tour"
        players={players}
        currentIndex={0}
        rounds={[]}
        emptyLabel="Aucun coup"
        totalLabel="Total"
        totals={[{ value: 0 }, { value: 0 }]}
      />,
    )

    expect(screen.getByText('Aucun coup').getAttribute('colspan')).toBe('3')
  })
})
