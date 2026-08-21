import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface LudoButtonProps {
  text: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  iconOnly?: boolean
  disabled?: boolean
  ariaLabel?: string
  title?: string
  /** Escape hatch for layout-only overrides (e.g. align-self inside a flex panel) — never for restyling variants/colors. */
  className?: string
  onClick: () => void
}

/**
 * The single interactive-action primitive from the Ludo design system —
 * primary/secondary/ghost/danger intents, 3 sizes, an icon-only square mode
 * for +/- style steppers.
 */
export function LudoButton({
  text,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  disabled = false,
  ariaLabel,
  title,
  className,
  onClick,
}: LudoButtonProps) {
  const classes = ['ludo-btn', `ludo-btn--${variant}`, `ludo-btn--${size}`]
  if (iconOnly) classes.push('ludo-btn--icon')
  if (className) classes.push(className)

  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      onClick={() => {
        if (!disabled) onClick()
      }}
    >
      {text}
    </button>
  )
}
