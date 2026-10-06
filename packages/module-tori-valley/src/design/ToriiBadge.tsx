import type { ReactNode } from 'react'
import './ToriiBadge.css'

export type ToriiBadgeColor = 'green' | 'red' | 'blue' | 'yellow' | 'purple'

export interface ToriiBadgeProps {
  color: ToriiBadgeColor
  children: ReactNode
}

/** A Torī colour name on that colour: the game's own palette, drawn from the design system's accents. */
export function ToriiBadge({ color, children }: ToriiBadgeProps) {
  return <span className={`tv-torii-badge tv-torii-badge--${color}`}>{children}</span>
}
