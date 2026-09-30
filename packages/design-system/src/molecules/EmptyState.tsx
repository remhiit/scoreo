import type { ReactNode } from 'react'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/icons'

export interface EmptyStateProps {
  /** What is missing. */
  title?: ReactNode
  icon?: IconName
  /** How to fill it — one line, no call-to-action duplicating the action bar. */
  children?: ReactNode
}

export function EmptyState({ title, icon, children }: EmptyStateProps) {
  return (
    <div className="sc-empty">
      {icon && <Icon name={icon} size="lg" tone="muted" />}
      {title !== undefined && <div className="sc-empty__title">{title}</div>}
      {children !== undefined && <div>{children}</div>}
    </div>
  )
}
