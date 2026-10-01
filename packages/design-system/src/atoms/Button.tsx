import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Icon } from './Icon'
import type { IconName } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
  /** `pill` is reserved for the one floating action a screen is for. */
  shape?: 'default' | 'pill'
  /** `fill` grows inside a row of buttons, `full` spans its container. */
  width?: 'auto' | 'fill' | 'full'
  onClick?: () => void
}

/** Label alone, or icon leading the label. Never a trailing icon. */
interface ButtonWithLabelProps extends ButtonBaseProps {
  children: ReactNode
  icon?: IconName
  label?: undefined
}

/** Icon alone: square, same radius as the others, `label` becomes its accessible name. */
interface IconOnlyButtonProps extends ButtonBaseProps {
  icon: IconName
  label: string
  children?: undefined
}

export type ButtonProps = ButtonWithLabelProps | IconOnlyButtonProps

/**
 * The single interactive-action primitive: 4 intents × 3 sizes × 3 content
 * modes (label, icon, icon + label).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  title,
  shape = 'default',
  width = 'auto',
  onClick,
  icon,
  label,
  children,
}: ButtonProps) {
  const iconOnly = children === undefined
  return (
    <button
      type={type}
      className={cx(
        'sc-btn',
        `sc-btn--${variant}`,
        `sc-btn--${size}`,
        iconOnly && 'sc-btn--icon',
        shape === 'pill' && 'sc-btn--pill',
        width !== 'auto' && `sc-btn--${width}`,
      )}
      disabled={disabled}
      aria-label={iconOnly ? label : undefined}
      title={title}
      onClick={() => {
        if (!disabled) onClick?.()
      }}
    >
      {icon && <Icon name={icon} size={iconOnly && size !== 'sm' ? 'md' : 'sm'} />}
      {children}
    </button>
  )
}
