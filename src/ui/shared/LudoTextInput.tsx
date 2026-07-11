import type { ButtonSize } from './LudoButton'

export interface LudoTextInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  size?: ButtonSize
  disabled?: boolean
  invalid?: boolean
  autofocus?: boolean
  onEnter?: () => void
}

/** Plain text field. Controlled: `value` always reflects the caller's state. */
export function LudoTextInput({
  value,
  onChange,
  label,
  placeholder,
  size = 'md',
  disabled = false,
  invalid = false,
  autofocus = false,
  onEnter,
}: LudoTextInputProps) {
  const classes = ['ludo-input', `ludo-input--${size}`, 'ludo-input--bare']
  if (invalid) classes.push('ludo-input--invalid')

  return (
    <div className="ludo-field">
      {label && <label className="ludo-field__label">{label}</label>}
      <input
        type="text"
        className={classes.join(' ')}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autofocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={(e) => {
          if (onEnter && e.key === 'Enter') onEnter()
        }}
      />
    </div>
  )
}
