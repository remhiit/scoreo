import type { ReactNode } from 'react'

export interface FilterBarProps {
  label: string
  /** The control, typically `<Select size="sm">`. */
  children: ReactNode
}

/** Stays on screen even when the list is empty, so no data never reads as a broken filter. */
export function FilterBar({ label, children }: FilterBarProps) {
  return (
    <div className="sc-filter" role="group" aria-label={label}>
      <span className="sc-filter__label">{label}</span>
      <div className="sc-filter__control">{children}</div>
    </div>
  )
}
