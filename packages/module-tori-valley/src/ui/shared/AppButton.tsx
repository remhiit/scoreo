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
  // Every class of ours carries the module's `tv-` prefix: the module renders
  // inside Scoreo, whose own stylesheet claims plain names like `.card` and
  // `.button`, and scoping keeps the module out of the host — never the host out
  // of the module. See doc/technical/module-contract.md.
  const classes = [
    'tv-button',
    variant !== 'primary' ? `tv-${variant}` : '',
    iconOnly ? 'tv-icon-only' : '',
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
