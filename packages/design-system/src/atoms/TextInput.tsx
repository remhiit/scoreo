import { useId } from 'react'
import { cx } from '../cx'
import { Field } from './Field'

export type FieldSize = 'sm' | 'md' | 'lg'

export interface TextInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  /** Accessible name when there is no visible label. */
  ariaLabel?: string
  placeholder?: string
  size?: FieldSize
  disabled?: boolean
  /** Paints the danger border; pair with `error` to say why. */
  invalid?: boolean
  error?: string
  hint?: string
  autoFocus?: boolean
  /** Fired on Enter — the field's implicit submit. */
  onEnter?: () => void
  id?: string
}

/** Plain text field. Controlled: `value` always reflects the caller's state. */
export function TextInput({
  value,
  onChange,
  label,
  ariaLabel,
  placeholder,
  size = 'md',
  disabled = false,
  invalid = false,
  error,
  hint,
  autoFocus = false,
  onEnter,
  id,
}: TextInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const isInvalid = invalid || error !== undefined
  return (
    <Field id={inputId} label={label} error={error} hint={hint}>
      <input
        id={inputId}
        type="text"
        className={cx('sc-input', `sc-input--${size}`, isInvalid && 'sc-input--invalid')}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={isInvalid || undefined}
        aria-describedby={(error ?? hint) ? `${inputId}-message` : undefined}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={(e) => {
          if (onEnter && e.key === 'Enter') onEnter()
        }}
      />
    </Field>
  )
}
