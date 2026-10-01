import { useId } from 'react'
import { cx } from '../cx'
import { Field } from './Field'
import type { FieldSize } from './TextInput'

export interface DateInputProps {
  /** `YYYY-MM-DD`. */
  value: string
  onChange: (value: string) => void
  label?: string
  ariaLabel?: string
  /** Latest selectable day, `YYYY-MM-DD`. */
  max?: string
  size?: FieldSize
  /** `inline` puts the label beside the field instead of above it. */
  layout?: 'stacked' | 'inline'
  id?: string
}

/** Native date picker in the system's field style. */
export function DateInput({
  value,
  onChange,
  label,
  ariaLabel,
  max,
  size = 'sm',
  layout = 'stacked',
  id,
}: DateInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const input = (
    <input
      id={inputId}
      type="date"
      className={cx('sc-input', `sc-input--${size}`, 'sc-input--date')}
      value={value}
      max={max}
      aria-label={label ? undefined : ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  )
  if (layout === 'inline' && label) {
    return (
      <div className="sc-inline-field">
        <label className="sc-field__label" htmlFor={inputId}>
          {label}
        </label>
        {input}
      </div>
    )
  }
  return (
    <Field id={inputId} label={label}>
      {input}
    </Field>
  )
}
