import type { ReactNode } from 'react'

/** Two columns of `<StandingsCard>`: eight players fit with no scrolling, the table reads in one glance. */
export function StandingsGrid({
  children,
  ariaLabel,
}: {
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <div className="sc-standings" role="list" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
