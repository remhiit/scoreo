import { useId } from 'react'
import { cx } from '../cx'
import { Button } from './Button'
import { Field } from './Field'
import type { FieldSize } from './TextInput'

function clamp(n: number, min?: number, max?: number): number {
  let v = n
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return v
}

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  ariaLabel?: string
  min?: number
  max?: number
  step?: number
  /**
   * `stepper` (default) draws −, value, + for one-thumb entry; `plain` is a bare
   * numeric field; `cell` is the compact 60px field of a history cell.
   */
  mode?: 'stepper' | 'plain' | 'cell'
  size?: FieldSize
  disabled?: boolean
  invalid?: boolean
  error?: string
  decreaseLabel?: string
  increaseLabel?: string
  id?: string
}

/** Number field, always in the score font. Unparseable input is ignored, never coerced to 0. */
export function NumberInput({
  value,
  onChange,
  label,
  ariaLabel,
  min,
  max,
  step = 1,
  mode = 'stepper',
  size = 'md',
  disabled = false,
  invalid = false,
  error,
  decreaseLabel = 'Decrease',
  increaseLabel = 'Increase',
  id,
}: NumberInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const isInvalid = invalid || error !== undefined
  const handleChange = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isNaN(parsed)) onChange(clamp(parsed, min, max))
  }

  const input = (
    <input
      id={inputId}
      type="number"
      inputMode="numeric"
      className={cx(
        'sc-input',
        'sc-input--number',
        `sc-input--${mode === 'cell' ? 'sm' : size}`,
        `sc-input--${mode}`,
        isInvalid && 'sc-input--invalid',
      )}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={label ? undefined : ariaLabel}
      aria-invalid={isInvalid || undefined}
      onChange={(e) => handleChange(e.target.value)}
    />
  )

  return (
    <Field id={inputId} label={label} error={error}>
      {mode === 'stepper' ? (
        <div className="sc-stepper">
          <Button
            variant="secondary"
            size={size}
            icon="minus"
            label={decreaseLabel}
            disabled={disabled || (min !== undefined && value <= min)}
            onClick={() => onChange(clamp(value - step, min, max))}
          />
          {input}
          <Button
            variant="secondary"
            size={size}
            icon="plus"
            label={increaseLabel}
            disabled={disabled || (max !== undefined && value >= max)}
            onClick={() => onChange(clamp(value + step, min, max))}
          />
        </div>
      ) : (
        input
      )}
    </Field>
  )
}
