import { useEffect, type ReactNode } from 'react'

export interface LudoModalProps {
  open: boolean
  title?: string
  onClose?: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Centered dialog with scrim, for add/edit flows, confirmations, or rules.
 * Closes on scrim click or Escape.
 */
export function LudoModal({ open, title, onClose, footer, children }: LudoModalProps) {
  useEffect(() => {
    if (!open) return
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ludo-modal-scrim" onClick={() => onClose?.()}>
      <div
        className="ludo-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="ludo-modal__header">
            <h2 className="ludo-modal__title">{title}</h2>
            {onClose && (
              <button type="button" className="ludo-modal__close" aria-label="Close" onClick={onClose}>
                ×
              </button>
            )}
          </div>
        )}
        <div className="ludo-modal__body">{children}</div>
        {footer && <div className="ludo-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
