import { LudoButton, type ButtonSize } from './LudoButton'

function clamp(n: number, min?: number, max?: number): number {
  let v = n
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return v
}

export interface LudoNumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  stepper?: boolean
  size?: ButtonSize
  disabled?: boolean
}

/**
 * Number field. Defaults to a stepper (-, value, +) sized for one-thumb
 * tapping, matching the Ludo design system's score-entry fields — pass
 * `stepper={false}` for a plain numeric field.
 */
export function LudoNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  stepper = true,
  size = 'md',
  disabled = false,
}: LudoNumberInputProps) {
  const handleChange = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isNaN(parsed)) onChange(clamp(parsed, min, max))
  }

  if (!stepper) {
    return (
      <div className="ludo-field">
        <input
          type="number"
          className={`ludo-input ludo-input--${size} ludo-input--bare ludo-input--mono`}
          value={value}
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    )
  }

  return (
    <div className="ludo-field">
      <div className="ludo-stepper">
        <LudoButton
          text="−"
          variant="secondary"
          size={size}
          iconOnly
          disabled={disabled || (min !== undefined && value <= min)}
          ariaLabel="Decrease"
          onClick={() => onChange(clamp(value - step, min, max))}
        />
        <input
          type="number"
          className={`ludo-input ludo-input--${size} ludo-input--stepper-field ludo-input--mono`}
          value={value}
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
        />
        <LudoButton
          text="+"
          variant="secondary"
          size={size}
          iconOnly
          disabled={disabled || (max !== undefined && value >= max)}
          ariaLabel="Increase"
          onClick={() => onChange(clamp(value + step, min, max))}
        />
      </div>
    </div>
  )
}
