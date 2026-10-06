import type { ReactNode } from 'react'
import './ModuleRoot.css'

/** The element carrying the `.module-tori-valley` scope every rule of `src/design/` hangs on. */
export function ModuleRoot({ children }: { children: ReactNode }) {
  return (
    <div className="module-tori-valley">
      <div className="tv-shell">{children}</div>
    </div>
  )
}
