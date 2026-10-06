import type { ReactNode } from 'react'
import './GameColumns.css'

/**
 * The playing screen's two columns — the scoreboard, the turn being counted —
 * side by side once the screen is wide enough to hold a table and the dice
 * next to each other, stacked otherwise.
 */
export function GameColumns({ children }: { children: ReactNode }) {
  return <div className="ms-columns">{children}</div>
}

/** One column, a landmark named after what it holds. */
export function GameColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="ms-column" aria-label={label}>
      {children}
    </section>
  )
}
