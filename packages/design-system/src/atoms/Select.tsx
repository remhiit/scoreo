import { useId } from 'react'
import { cx } from '../cx'
import { Field } from './Field'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  ariaLabel?: string
  /** Rendered as a first, empty-valued option. */
  placeholder?: string
  /** `md` form field (44px), `sm` compact filter (32px). */
  size?: 'sm' | 'md'
  disabled?: boolean
  error?: string
  id?: string
}

/**
 * Native select with a drawn chevron: the native arrow can't be inset from the
 * edge, and a mask (not a data-URI colour) lets the chevron follow the theme.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  placeholder,
  size = 'md',
  disabled = false,
  error,
  id,
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field id={selectId} label={label} error={error}>
      <span className={cx('sc-select', `sc-select--${size}`)}>
        <select
          id={selectId}
          className="sc-select__control"
          value={value}
          disabled={disabled}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error !== undefined || undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </Field>
  )
}
