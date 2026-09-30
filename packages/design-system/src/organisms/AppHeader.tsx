import type { ReactNode } from 'react'
import { Button } from '../atoms/Button'

export interface HeaderAction {
  label: string
  onClick: () => void
}

export interface AppHeaderProps {
  title: ReactNode
  /** Back arrow on the left; without it the slot stays empty so the title stays centred. */
  back?: HeaderAction
  /** Burger on the right. */
  menu?: HeaderAction
  /** Tapping the title, e.g. to go home. */
  onTitleClick?: () => void
}

/** Back (or nothing) left, title centred, burger right — invariant across every screen. */
export function AppHeader({ title, back, menu, onTitleClick }: AppHeaderProps) {
  return (
    <header className="sc-header">
      <span className="sc-header__slot">
        {back && <Button variant="ghost" icon="back" label={back.label} onClick={back.onClick} />}
      </span>
      {onTitleClick ? (
        <button
          type="button"
          className="sc-header__title sc-header__title--link"
          onClick={onTitleClick}
        >
          {title}
        </button>
      ) : (
        <h1 className="sc-header__title">{title}</h1>
      )}
      <span className="sc-header__slot">
        {menu && <Button variant="ghost" icon="menu" label={menu.label} onClick={menu.onClick} />}
      </span>
    </header>
  )
}
