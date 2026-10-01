import { useEffect, useId, type ReactNode } from 'react'

export interface SheetProps {
  open: boolean
  title: string
  /** Scrim click and Escape. */
  onClose: () => void
  /** Scrolling body, typically `<SheetRow>`s. */
  children: ReactNode
  /** Pinned under the rows — usually a `<ButtonRow>`. */
  actions?: ReactNode
}

/**
 * Bottom sheet: a task you complete then dismiss, while what's behind stays
 * readable — unlike a dialog, which hides its context.
 */
export function Sheet({ open, title, onClose, children, actions }: SheetProps) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="sc-sheet-scrim" onClick={onClose} />
      <div className="sc-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="sc-sheet__grip" aria-hidden="true" />
        <h2 id={titleId} className="sc-sheet__title">
          {title}
        </h2>
        <div className="sc-sheet__rows">{children}</div>
        {actions}
      </div>
    </>
  )
}

export interface SheetRowProps {
  name: string
  /** Running total beside the name, e.g. `16`. */
  meta?: ReactNode
  /** The field, typically `<NumberInput size="sm">`. */
  children: ReactNode
}

export function SheetRow({ name, meta, children }: SheetRowProps) {
  return (
    <div className="sc-sheet-row">
      <span className="sc-sheet-row__name">
        {name}
        {meta !== undefined && <span className="sc-sheet-row__meta"> · {meta}</span>}
      </span>
      {children}
    </div>
  )
}
