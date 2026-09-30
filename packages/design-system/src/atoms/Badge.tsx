import type { ReactNode } from 'react'
import { cx } from '../cx'

export type BadgeTone = 'neutral' | 'accent' | 'solid' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  tone?: BadgeTone
  /** A leading word, kept in the UI font while the figure stays monospaced. */
  label?: ReactNode
  /** Accessible name when the content is a picto + a number. */
  ariaLabel?: string
  children: ReactNode
}

/** One pill shape for ELO, trophies, deltas and counts. */
export function Badge({ tone = 'neutral', label, ariaLabel, children }: BadgeProps) {
  return (
    <span className={cx('sc-badge', `sc-badge--${tone}`)} aria-label={ariaLabel}>
      {label !== undefined && <span className="sc-badge__label">{label}</span>}
      {children}
    </span>
  )
}
