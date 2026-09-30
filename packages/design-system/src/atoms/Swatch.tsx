import { cx } from '../cx'
import { type Hue } from './hues'

export interface SwatchProps {
  hue: Hue
  label: string
  selected?: boolean
  onClick: () => void
}

/** A 26px colour dot inside a 44px button: tappable without growing the dot. */
export function Swatch({ hue, label, selected = false, onClick }: SwatchProps) {
  return (
    <button
      type="button"
      className="sc-swatch"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
    >
      <span
        className={cx(
          'sc-swatch__dot',
          `sc-swatch__dot--${hue}`,
          selected && 'sc-swatch__dot--selected',
        )}
      />
    </button>
  )
}
