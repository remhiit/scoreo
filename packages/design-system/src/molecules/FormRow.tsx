import type { ReactNode } from 'react'

/** A field that grows, then its submit button — e.g. "Player name [+ Add]". */
export function FormRow({ children }: { children: ReactNode }) {
  return <div className="sc-form-row">{children}</div>
}

/** Buttons sharing a row equally — dialog, sheet and action-bar footers. */
export function ButtonRow({
  children,
  align = 'fill',
}: {
  children: ReactNode
  align?: 'fill' | 'end'
}) {
  return (
    <div className={align === 'end' ? 'sc-button-row sc-button-row--end' : 'sc-button-row'}>
      {children}
    </div>
  )
}
