import type { ReactNode } from 'react'
import './SkyjoWinner.css'

/** The end-of-game banner: the trophy, then whatever announces the winner. */
export function SkyjoWinner({ children }: { children: ReactNode }) {
  return (
    <div className="sj-winner">
      <div className="sj-trophy" aria-hidden="true">
        🏆
      </div>
      {children}
    </div>
  )
}
