import type { ReactNode } from 'react'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/icons'

export interface BannerProps {
  title?: ReactNode
  /** Numbered guide, e.g. the first-launch steps. */
  steps?: ReactNode[]
  /** The whole banner becomes this one accent action, e.g. "Resume match in progress". */
  action?: { label: ReactNode; icon?: IconName; onClick: () => void }
  children?: ReactNode
}

/** One accent-tinted container for onboarding and resume — same tint as a selected row. */
export function Banner({ title, steps, action, children }: BannerProps) {
  return (
    <div className="sc-banner">
      {title !== undefined && <h3 className="sc-banner__title">{title}</h3>}
      {steps && (
        <ol className="sc-banner__steps">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
      {children}
      {action && (
        <button type="button" className="sc-banner__action" onClick={action.onClick}>
          {action.icon && <Icon name={action.icon} size="sm" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  )
}
