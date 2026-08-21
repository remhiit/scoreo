import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface AppButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  text: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  iconOnly?: boolean
  ariaLabel?: string
}

export function AppButton({
  text,
  variant = 'primary',
  iconOnly,
  ariaLabel,
  className,
  ...rest
}: AppButtonProps) {
  const classes = [
    'button',
    variant !== 'primary' ? variant : '',
    iconOnly ? 'icon-only' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={classes} aria-label={ariaLabel} {...rest}>
      {text}
    </button>
  )
}
