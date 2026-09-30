import type { ReactNode } from 'react'

export interface ActionBarProps {
  /**
   * `center`: one pill button, the thing the screen is for. `stack`: a
   * full-width primary over a `<ButtonRow>` of secondaries. Never more than one primary.
   */
  layout?: 'center' | 'stack'
  children: ReactNode
}

/** Pinned to the bottom of the screen, above the content it acts on. */
export function ActionBar({ layout = 'stack', children }: ActionBarProps) {
  return <div className={`sc-action-bar sc-action-bar--${layout}`}>{children}</div>
}
