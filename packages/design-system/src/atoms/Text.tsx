import type { ReactNode } from 'react'
import { cx } from '../cx'

export type TextVariant =
  | 'body'
  | 'muted'
  | 'hint'
  | 'error'
  | 'warning'
  | 'success'
  | 'strong'
  | 'label'
  | 'title'
  | 'heading'
  | 'caption'
  | 'mono'

export interface TextProps {
  /**
   * body 15px · muted/hint 13px secondary · error/warning/success 13px status ·
   * strong semibold heading color · label 13px uppercase section label ·
   * title 18px/600 · heading 22px/600 · caption 12px · mono score font.
   */
  variant?: TextVariant
  /** Block-level text renders a `<p>`, inline text a `<span>`. */
  block?: boolean
  align?: 'start' | 'center'
  children: ReactNode
}

/** Every piece of copy the app renders goes through one of these roles. */
export function Text({ variant = 'body', block = false, align = 'start', children }: TextProps) {
  const Tag = block ? 'p' : 'span'
  return (
    <Tag
      className={cx(
        'sc-text',
        `sc-text--${variant}`,
        block && 'sc-text--block',
        align === 'center' && 'sc-text--center',
      )}
      role={variant === 'error' ? 'alert' : undefined}
    >
      {children}
    </Tag>
  )
}
