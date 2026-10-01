import { cx } from '../cx'
import { ICONS, type IconName } from './icons'

export type IconSize = 'sm' | 'md' | 'lg'

export interface IconProps {
  name: IconName
  /** sm 16px (inside buttons and lines), md 20px (header, menu), lg 30px (drop zone). */
  size?: IconSize
  /** Omit for a decorative icon (hidden from assistive tech); set when the icon carries meaning alone. */
  label?: string
  tone?: 'current' | 'accent' | 'muted'
}

export function Icon({ name, size = 'md', label, tone = 'current' }: IconProps) {
  const Glyph = ICONS[name]
  return (
    <Glyph
      className={cx('sc-icon', `sc-icon--${size}`, tone !== 'current' && `sc-icon--${tone}`)}
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
      role={label === undefined ? undefined : 'img'}
    />
  )
}
