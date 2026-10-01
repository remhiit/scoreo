import { useEffect, useId, type ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  /** States the action, e.g. "Delete match?". */
  title?: string
  /** Scrim click, Escape and the × button. Without it the dialog can only be left through its actions. */
  onClose?: () => void
  closeLabel?: string
  /** Body: one plain sentence, plus the affected records when something is deleted. */
  children: ReactNode
  /** Footer buttons, confirming button last — usually a `<ButtonRow>`. */
  actions?: ReactNode
}

/** Centred dialog on a scrim. */
export function Dialog({
  open,
  title,
  onClose,
  closeLabel = 'Close',
  children,
  actions,
}: DialogProps) {
  const titleId = useId()
  useEffect(() => {
    if (!open || !onClose) return
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sc-dialog-scrim" onClick={() => onClose?.()}>
      <div
        className="sc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="sc-dialog__header">
            <h2 id={titleId} className="sc-dialog__title">
              {title}
            </h2>
            {onClose && (
              <button
                type="button"
                className="sc-dialog__close"
                aria-label={closeLabel}
                onClick={onClose}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="sc-dialog__body">{children}</div>
        {actions && <div className="sc-dialog__footer">{actions}</div>}
      </div>
    </div>
  )
}
