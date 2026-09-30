import type { ReactNode } from 'react'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/icons'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info'

const TONE_ICON: Record<StatusTone, IconName> = {
  success: 'check',
  warning: 'alert',
  danger: 'error',
  info: 'cloud',
}

export interface StatusLineProps {
  tone: StatusTone
  children: ReactNode
  /** Secondary lines under the status, e.g. the ids that failed. */
  details?: ReactNode[]
}

/** An outcome, coloured by its semantic token: imported / skipped / failed / synced. */
export function StatusLine({ tone, children, details = [] }: StatusLineProps) {
  return (
    <div className="sc-status">
      <div className={`sc-status__line sc-status__line--${tone}`}>
        <Icon name={TONE_ICON[tone]} size="sm" />
        <span>{children}</span>
      </div>
      {details.map((detail, i) => (
        <div key={i} className="sc-status__detail">
          {detail}
        </div>
      ))}
    </div>
  )
}
