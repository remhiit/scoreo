import type { ReactNode } from 'react'
import { cx } from '../cx'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
}

/** The label is the tap target and carries the full 44px — never a bare box. */
export function Checkbox({ checked, onChange, children, disabled = false }: CheckboxProps) {
  return (
    <label className={cx('sc-checkbox', disabled && 'sc-checkbox--disabled')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}
