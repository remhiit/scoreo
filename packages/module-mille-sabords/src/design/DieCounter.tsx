import { Button } from '@scoreboards/design-system'
import './DieCounter.css'

export interface DieCounterProps {
  /** The face, as the box draws it (an emoji). */
  face: string
  label: string
  count: number
  onDecrease: () => void
  onIncrease: () => void
}

/**
 * One face of the dice being counted out: the face, its name, and how many of
 * the eight dice show it. The count is read, never typed — the players tap it
 * up and down as they sort the dice — so it is an `<output>`, not a field.
 */
export function DieCounter({ face, label, count, onDecrease, onIncrease }: DieCounterProps) {
  return (
    <div className="ms-die">
      <span className="ms-die__face" aria-hidden="true">
        {face}
      </span>
      <span className="ms-die__label">{label}</span>
      <Button
        variant="secondary"
        size="sm"
        icon="minus"
        label={`Retirer un ${label}`}
        onClick={onDecrease}
      />
      <output className="ms-die__count" aria-label={`${label} : compteur`}>
        {count}
      </output>
      <Button
        variant="secondary"
        size="sm"
        icon="plus"
        label={`Ajouter un ${label}`}
        onClick={onIncrease}
      />
    </div>
  )
}
