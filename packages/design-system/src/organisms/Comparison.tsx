import type { ReactNode } from 'react'

export interface ComparisonCardProps {
  title: ReactNode
  /** One muted line per figure, e.g. "5 players". */
  stats: ReactNode[]
}

export function ComparisonCard({ title, stats }: ComparisonCardProps) {
  return (
    <div className="sc-compare__card">
      <div className="sc-compare__title">{title}</div>
      {stats.map((stat, i) => (
        <div key={i} className="sc-compare__stat">
          {stat}
        </div>
      ))}
    </div>
  )
}

/** Two symmetric `<ComparisonCard>`s side by side — never pre-pick a side for the user. */
export function Comparison({ children }: { children: ReactNode }) {
  return <div className="sc-compare">{children}</div>
}
