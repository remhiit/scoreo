import './VariantPicker.css'

export interface VariantPickerProps<T extends string> {
  /** Groups the radios: one pick per landscape. */
  name: string
  variants: readonly T[]
  value: T
  onChange: (variant: T) => void
  /** Accessible name of the radio for a given variant. */
  ariaLabel: (variant: T) => string
}

/** One Objectif card variant out of a few (A/B/C): native radios drawn as a segmented control. */
export function VariantPicker<T extends string>({
  name,
  variants,
  value,
  onChange,
  ariaLabel,
}: VariantPickerProps<T>) {
  return (
    <div className="tv-variants">
      {variants.map((variant) => (
        <label className="tv-variant" key={variant}>
          <input
            type="radio"
            name={name}
            aria-label={ariaLabel(variant)}
            checked={value === variant}
            onChange={() => onChange(variant)}
          />
          <span className="tv-variant__face">{variant}</span>
        </label>
      ))}
    </div>
  )
}
