import type { ReactNode } from 'react'
import { cx } from '../cx'

export interface ChipProps {
  selected?: boolean
  onClick: () => void
  children: ReactNode
}

/** A single choice among a few words — flavor, language. */
export function Chip({ selected = false, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      className={cx('sc-chip', selected && 'sc-chip--selected')}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
