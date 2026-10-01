import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Delta, Rank } from '../atoms/Score'

export interface StandingsCardProps {
  rank: ReactNode
  name: string
  total: ReactNode
  /** Last round's contribution, e.g. `+4`. */
  delta?: ReactNode
  /** The leader is bordered in the accent, never filled — the number stays the loudest thing. */
  lead?: boolean
}

export function StandingsCard({ rank, name, total, delta, lead = false }: StandingsCardProps) {
  return (
    <div className={cx('sc-standing', lead && 'sc-standing--lead')} role="listitem">
      <div className="sc-standing__top">
        <Rank>{rank}</Rank>
        <span className="sc-standing__name">{name}</span>
      </div>
      <div className="sc-standing__bottom">
        <span className="sc-standing__total">{total}</span>
        {delta !== undefined && <Delta>{delta}</Delta>}
      </div>
    </div>
  )
}
