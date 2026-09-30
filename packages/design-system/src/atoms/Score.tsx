import type { ReactNode } from 'react'
import { cx } from '../cx'

export interface ScoreProps {
  /** sm 13px (inline, cells) · md 16px (rows) · lg 24px · xl 26px (standings totals). */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'default' | 'accent' | 'muted'
  children: ReactNode
}

/** A score figure: monospaced and tabular, so columns stay aligned as they change. */
export function Score({ size = 'md', tone = 'default', children }: ScoreProps) {
  return (
    <span className={cx('sc-score', `sc-score--${size}`, `sc-score--${tone}`)}>{children}</span>
  )
}

/** Ordinal position in a ranking — faint, so the score stays the loudest thing. */
export function Rank({ children }: { children: ReactNode }) {
  return <span className="sc-rank">{children}</span>
}

/** Change since the previous round, e.g. `+4`. */
export function Delta({ children }: { children: ReactNode }) {
  return <span className="sc-delta">{children}</span>
}
