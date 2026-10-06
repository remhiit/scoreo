import type { ReactNode } from 'react'

/**
 * The module's root: carries `.module-mille-sabords`, the scope every rule of
 * `src/design/` hangs from — and nothing else. Everything inside composes the
 * design system (layout included: `WideLayout`, `Columns`) and inherits
 * Scoreo's flavour and accent.
 */
export function ModuleRoot({ children }: { children: ReactNode }) {
  return <div className="module-mille-sabords">{children}</div>
}
