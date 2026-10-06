import type { ReactNode } from 'react'
import './ScorePreview.css'

/** What the hand is worth: points, nothing, a loss, or an island against everyone else. */
export type PreviewTone = 'positive' | 'zero' | 'negative' | 'island'

export interface ScorePreviewProps {
  score: string
  tone: PreviewTone
  /** `calculerScore`'s breakdown, one line per rule applied. */
  details: string
  /** What else the hand triggers — Pirate Magic, an island. */
  children?: ReactNode
}

/** The worth of the dice being counted, before the players record it. */
export function ScorePreview({ score, tone, details, children }: ScorePreviewProps) {
  return (
    <div className="ms-preview">
      <div className={`ms-preview__score ms-preview__score--${tone}`}>{score}</div>
      <div className="ms-preview__details">{details}</div>
      {children}
    </div>
  )
}
