import * as DesignSystem from '@scoreboards/design-system'

/**
 * Every component the design system exports: a capitalised function, or a
 * capitalised React object (`memo`, `forwardRef`) — both render as `<Name />`.
 */
export const DESIGN_SYSTEM_COMPONENTS: string[] = Object.entries(DesignSystem)
  .filter(
    ([name, value]) =>
      /^[A-Z]/.test(name) &&
      (typeof value === 'function' ||
        (typeof value === 'object' && value !== null && '$$typeof' in value)),
  )
  .map(([name]) => name)
  .sort()
