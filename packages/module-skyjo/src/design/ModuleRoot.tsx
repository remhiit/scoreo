import type { ReactNode } from 'react'
import './ModuleRoot.css'

/** The element carrying the `.module-skyjo` scope every rule of `src/design/` hangs on. */
export function ModuleRoot({ children }: { children: ReactNode }) {
  return (
    <div className="module-skyjo">
      <div className="sj-shell">{children}</div>
    </div>
  )
}
