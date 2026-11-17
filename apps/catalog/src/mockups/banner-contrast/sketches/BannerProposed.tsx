import type { ReactNode } from 'react'
import { Icon, type IconName } from '@scoreboards/design-system'
import './BannerProposed.css'

export interface BannerProposedProps {
  title?: ReactNode
  steps?: ReactNode[]
  action?: { label: ReactNode; icon?: IconName; onClick: () => void }
}

/**
 * Sketch of `Banner` once fixed: same tint, border and layout, but every line
 * of text reads in the body colour (≥ 5.3:1 on the tint in every flavour and
 * accent), the accent kept for the tint, the border, the step numbers and the
 * action icon. The title is no longer a heading (`<p>`, not `<h3>`): it labels
 * a hint, not a section of the page.
 */
export function BannerProposed({ title, steps, action }: BannerProposedProps) {
  return (
    <div className="mk-banner">
      {title !== undefined && <p className="mk-banner__title">{title}</p>}
      {steps && (
        <ol className="mk-banner__steps">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
      {action && (
        <button type="button" className="mk-banner__action" onClick={action.onClick}>
          {action.icon && <Icon name={action.icon} size="sm" tone="accent" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  )
}
