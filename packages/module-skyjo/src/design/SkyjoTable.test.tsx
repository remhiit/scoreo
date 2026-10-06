// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SkyjoTable } from './SkyjoTable'

afterEach(cleanup)

const labels = { totalLabel: 'Total', emptyLabel: 'Rien', doubledLabel: 'Doublé' }

describe('SkyjoTable', () => {
  it('shows the empty message when no round was played', () => {
    render(
      <SkyjoTable
        playerNames={['Alice', 'Bob']}
        rows={[]}
        totals={[
          { value: 0, leading: true },
          { value: 0, leading: true },
        ]}
        {...labels}
      />,
    )
    expect(screen.getByText('Rien')).toBeInTheDocument()
  })

  it('marks doubled cells and the leading totals', () => {
    render(
      <SkyjoTable
        playerNames={['Alice', 'Bob']}
        rows={[{ label: 'Manche 1', cells: [{ text: '4' }, { text: '20 ×2', doubled: true }] }]}
        totals={[
          { value: 4, leading: true },
          { value: 20, leading: false },
        ]}
        {...labels}
      />,
    )
    expect(screen.getByText('20 ×2')).toHaveAttribute('title', 'Doublé')
    expect(screen.getByText('4', { selector: 'td.sj-leading' })).toBeInTheDocument()
    expect(screen.getByText('20', { selector: 'td' })).not.toHaveClass('sj-leading')
    expect(screen.queryByText('Rien')).not.toBeInTheDocument()
  })
})
