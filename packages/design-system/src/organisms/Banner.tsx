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

/**
 * One accent-tinted container for onboarding and resume — same tint as a selected row.
 * The accent stays on the tint, the border and the action icon; every line of text
 * reads in the body colour, which keeps ≥ 5.3:1 on the tint in every flavour and
 * accent. The title labels a hint, not a section of the page, so it is no heading.
 */
export function Banner({ title, steps, action, children }: BannerProps) {
  return (
    <div className="sc-banner">
      {title !== undefined && <p className="sc-banner__title">{title}</p>}
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
          {action.icon && <Icon name={action.icon} size="sm" tone="accent" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  )
}
