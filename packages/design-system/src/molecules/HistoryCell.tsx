import type { ReactNode } from 'react'

export interface HistoryCellProps {
  name: string
  /** A `<Score size="sm">` to read, or a `<NumberInput mode="cell">` to edit in place. */
  children: ReactNode
}

/** Name and score on a two-column grid, so a card of cells aligns down its length. */
export function HistoryCell({ name, children }: HistoryCellProps) {
  return (
    <div className="sc-hcell">
      <span className="sc-hcell__name">{name}</span>
      {children}
    </div>
  )
}
