import type { ReactNode } from 'react'
import { cx } from '../cx'

export interface DetailRowProps {
  label: ReactNode
  value: ReactNode
  /** Score font for figures such as a head-to-head record. */
  mono?: boolean
}

/** A label/value pair, separated from the next by a hairline. */
export function DetailRow({ label, value, mono = false }: DetailRowProps) {
  return (
    <div className="sc-detail">
      <span className="sc-detail__label">{label}</span>
      <span className={cx('sc-detail__value', mono && 'sc-detail__value--mono')}>{value}</span>
    </div>
  )
}

/** A read-only record: game settings, import preview, player summary. `boxed` sits it on a sunken panel. */
export function DetailList({ children, boxed = false }: { children: ReactNode; boxed?: boolean }) {
  return <div className={cx('sc-details', boxed && 'sc-details--boxed')}>{children}</div>
}
