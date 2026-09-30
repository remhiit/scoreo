import type { ReactNode } from 'react'
import { cx } from '../cx'

export type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8

export interface StackProps {
  /** `column` stacks, `row` lines children up. */
  direction?: 'column' | 'row'
  /** A step of the 4px spacing scale (`--space-*`). */
  gap?: Space
  align?: 'stretch' | 'start' | 'center' | 'end' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
  /** Takes the remaining space of a parent stack. */
  grow?: boolean
  /** Extra space above, on the same scale — for separating sections. */
  spaceBefore?: Space
  children: ReactNode
}

/**
 * The one layout primitive. Screens arrange components with stacks, never with
 * margins or class names of their own.
 */
export function Stack({
  direction = 'column',
  gap = 2,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  grow = false,
  spaceBefore = 0,
  children,
}: StackProps) {
  return (
    <div
      className={cx(
        'sc-stack',
        `sc-stack--${direction}`,
        `sc-gap-${gap}`,
        align !== 'stretch' && `sc-stack--align-${align}`,
        justify !== 'start' && `sc-stack--justify-${justify}`,
        wrap && 'sc-stack--wrap',
        grow && 'sc-stack--grow',
        spaceBefore !== 0 && `sc-before-${spaceBefore}`,
      )}
    >
      {children}
    </div>
  )
}
