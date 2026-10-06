import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BulletList } from './BulletList'
import { DetailList, DetailRow } from './DetailList'
import { EmptyState } from './EmptyState'
import { FilterBar } from './FilterBar'
import { ListRow } from './ListRow'
import { SegmentedControl, TabPanel, Tabs } from './SegmentedControl'
import { StandingsCard } from './StandingsCard'
import { StatRow } from './StatRow'
import { StatusLine } from './StatusLine'

describe('ListRow', () => {
  it('tints the whole row when a selectable row is selected', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <ListRow title="Léa" subtitle="7W 4L" selectable selected onSelect={onSelect} />,
    )
    const toggle = screen.getByRole('button', { name: /Léa/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(container.firstChild).toHaveClass('sc-row--selected')
    fireEvent.click(toggle)
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('renders passive text without onSelect', () => {
    render(<ListRow title="Skyjo" players="Léa 16 · Théo 38" date="10 Jul 2026" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('10 Jul 2026')).toBeInTheDocument()
  })

  it('renders one icon button per action', () => {
    const onDelete = vi.fn()
    render(
      <ListRow
        title="Camille"
        actions={[
          { icon: 'edit', label: 'Rename', onClick: () => {} },
          { icon: 'delete', label: 'Delete', onClick: onDelete, tone: 'danger' },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('sc-row__action--danger')
  })
})

describe('StandingsCard', () => {
  it('borders the leader', () => {
    const { container } = render(<StandingsCard rank={1} name="Léa" total={16} delta="+4" lead />)
    expect(container.firstChild).toHaveClass('sc-standing--lead')
    expect(screen.getByText('+4')).toBeInTheDocument()
  })
})

describe('StatRow', () => {
  it('is a button when clickable and carries its meter', () => {
    const onClick = vi.fn()
    render(<StatRow title="Camille" subtitle="12W 5L" rate={0.7} value="70%" onClick={onClick} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '70')
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows the headline score and renders as a passive line inside a panel', () => {
    const { container } = render(<StatRow title="Camille" score="1200" variant="line" />)
    expect(screen.getByText('1200')).toHaveClass('sc-stat__score')
    expect(container.firstChild).toHaveClass('sc-stat--line')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('meter')).toBeNull()
  })
})

describe('SegmentedControl and Tabs', () => {
  const options = [
    { value: 'standings', label: 'Standings' },
    { value: 'history', label: 'History' },
  ] as const

  it('segmented control reports the chosen view', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        ariaLabel="View"
        options={[...options]}
        value="standings"
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('button', { name: 'Standings' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(onChange).toHaveBeenCalledWith('history')
  })

  it('a tab panel is a named tabpanel holding its content', () => {
    render(
      <TabPanel ariaLabel="History">
        <p>Round 1</p>
      </TabPanel>,
    )
    const panel = screen.getByRole('tabpanel', { name: 'History' })
    expect(panel).toHaveClass('sc-tabpanel')
    expect(panel).toHaveTextContent('Round 1')
  })

  it('tabs expose the selected tab', () => {
    render(<Tabs ariaLabel="Game" options={[...options]} value="history" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Detail, status, filter and empty', () => {
  it('render their content', () => {
    render(
      <>
        <DetailList>
          <DetailRow label="Win condition" value="Lowest score" />
        </DetailList>
        <StatusLine tone="danger" details={['match-42']}>
          1 failed
        </StatusLine>
        <FilterBar label="Filter by game">
          <span>control</span>
        </FilterBar>
        <EmptyState title="No matches yet">Play a match to see it here.</EmptyState>
      </>,
    )
    expect(screen.getByText('Lowest score')).toBeInTheDocument()
    expect(screen.getByText('match-42')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filter by game' })).toBeInTheDocument()
    expect(screen.getByText('No matches yet')).toBeInTheDocument()
  })
})

describe('BulletList', () => {
  it('renders one list item per entry in a sc-bullets list', () => {
    const { container } = render(<BulletList items={['Léa', 'Théo']} />)
    expect(container.querySelector('ul.sc-bullets')).not.toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Théo')).toBeInTheDocument()
  })
})
