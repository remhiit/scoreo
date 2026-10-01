import { cx } from '../cx'

export interface NumberFieldProps {
  /**
   * Controlled as text, so an edit in progress survives: an empty cell, a lone
   * `-`. The caller parses when it needs the figure.
   */
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  /** `cell` 60px (history cell), `plain` 72px. */
  mode?: 'cell' | 'plain'
  disabled?: boolean
  invalid?: boolean
}

/** Bare numeric field in the score font, for editing a stored score in place. */
export function NumberField({
  value,
  onChange,
  ariaLabel,
  mode = 'cell',
  disabled = false,
  invalid = false,
}: NumberFieldProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={cx(
        'sc-input',
        'sc-input--sm',
        'sc-input--number',
        mode === 'cell' ? 'sc-input--cell' : 'sc-input--stepper',
        invalid && 'sc-input--invalid',
      )}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
