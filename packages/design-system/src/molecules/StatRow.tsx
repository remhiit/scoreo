import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Meter } from '../atoms/Meter'
import { useInList } from './listContext'

export interface StatRowProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Headline figure before the meter, e.g. the ELO rating (score font, accent). */
  score?: ReactNode
  /** Win rate 0..1, drawn as a meter. */
  rate?: number
  /** Accessible name of the meter. */
  rateLabel?: string
  /** Figure shown after the meter, e.g. `70%`. */
  value?: ReactNode
  /** Right-most slot, e.g. a `<Badge>`. */
  trailing?: ReactNode
  onClick?: () => void
  /** `card` sits on a sunken card (leaderboard); `line` is a hairline-separated row inside a panel (head-to-head, record holders). */
  variant?: 'card' | 'line'
}

/**
 * A leaderboard line: who, their rating, how often they win. Inside a `<List>`
 * it is wrapped in a layout-neutral `listitem` (`display: contents`), since a
 * clickable row is a button and must keep that role.
 */
export function StatRow({
  title,
  subtitle,
  score,
  rate,
  rateLabel = 'Win rate',
  value,
  trailing,
  onClick,
  variant = 'card',
}: StatRowProps) {
  const inList = useInList()
  const classes = cx('sc-stat', `sc-stat--${variant}`, onClick && 'sc-stat--interactive')
  const content = (
    <>
      <span className="sc-stat__info">
        <span className="sc-stat__title">{title}</span>
        {subtitle !== undefined && <span className="sc-stat__subtitle">{subtitle}</span>}
      </span>
      {score !== undefined && <span className="sc-stat__score">{score}</span>}
      {rate !== undefined && <Meter value={rate} label={rateLabel} />}
      {value !== undefined && <span className="sc-stat__value">{value}</span>}
      {trailing}
    </>
  )
  const row = onClick ? (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  )
  return inList ? (
    <div className="sc-list__item" role="listitem">
      {row}
    </div>
  ) : (
    row
  )
}
