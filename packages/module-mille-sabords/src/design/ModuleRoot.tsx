import type { ReactNode } from 'react'
import './ModuleRoot.css'

/**
 * The module's root: carries `.module-mille-sabords`, the scope every rule of
 * `src/design/` hangs from, and caps the column on a wide screen. Everything
 * inside composes the design system and inherits Scoreo's flavour and accent.
 */
export function ModuleRoot({ children }: { children: ReactNode }) {
  return (
    <div className="module-mille-sabords">
      <div className="ms-shell">{children}</div>
    </div>
  )
}
