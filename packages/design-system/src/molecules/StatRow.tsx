import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Meter } from '../atoms/Meter'

export interface StatRowProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Win rate 0..1, drawn as a meter. */
  rate?: number
  /** Accessible name of the meter. */
  rateLabel?: string
  /** Figure shown after the meter, e.g. `70%`. */
  value?: ReactNode
  /** Right-most slot, e.g. an ELO `<Badge>`. */
  trailing?: ReactNode
  onClick?: () => void
}

/** A leaderboard line on a sunken card: who, how often they win, their rating. */
export function StatRow({
  title,
  subtitle,
  rate,
  rateLabel = 'Win rate',
  value,
  trailing,
  onClick,
}: StatRowProps) {
  const content = (
    <>
      <span className="sc-stat__info">
        <span className="sc-stat__title">{title}</span>
        {subtitle !== undefined && <span className="sc-stat__subtitle">{subtitle}</span>}
      </span>
      {rate !== undefined && <Meter value={rate} label={rateLabel} />}
      {value !== undefined && <span className="sc-stat__value">{value}</span>}
      {trailing}
    </>
  )
  return onClick ? (
    <button type="button" className={cx('sc-stat', 'sc-stat--interactive')} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="sc-stat">{content}</div>
  )
}
