import type { ReactNode } from 'react'
import './ModuleRoot.css'

/** The element carrying the `.module-flip-7` scope every rule of `src/design/` hangs on. */
export function ModuleRoot({ children }: { children: ReactNode }) {
  return (
    <div className="module-flip-7">
      <div className="f7-shell">{children}</div>
    </div>
  )
}
