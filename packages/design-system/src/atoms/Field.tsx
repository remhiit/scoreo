import type { ReactNode } from 'react'
import { cx } from '../cx'

interface FieldProps {
  id: string
  label?: string
  error?: string
  hint?: string
  children: ReactNode
}

/**
 * Label above, control, then one plain sentence under it — the error when there
 * is one, else the hint. Internal: every form atom renders through it.
 */
export function Field({ id, label, error, hint, children }: FieldProps) {
  const message = error ?? hint
  return (
    <div className="sc-field">
      {label && (
        <label className="sc-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {message && (
        <span
          id={`${id}-message`}
          className={cx('sc-field__message', error !== undefined && 'sc-field__message--error')}
          role={error !== undefined ? 'alert' : undefined}
        >
          {message}
        </span>
      )}
    </div>
  )
}
