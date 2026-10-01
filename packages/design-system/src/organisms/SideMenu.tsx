import { useEffect } from 'react'
import { Button } from '../atoms/Button'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/icons'

export interface SideMenuItem {
  icon: IconName
  label: string
  onClick: () => void
}

export interface SideMenuProps {
  open: boolean
  onClose: () => void
  closeLabel: string
  items: SideMenuItem[]
}

/** Slide-in navigation from the header's burger — same items whatever screen is underneath. */
export function SideMenu({ open, onClose, closeLabel, items }: SideMenuProps) {
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
      <div className="sc-menu-scrim" onClick={onClose} />
      <nav className="sc-menu">
        <span className="sc-menu__close">
          <Button variant="ghost" icon="close" label={closeLabel} onClick={onClose} />
        </span>
        {items.map((item) => (
          <button key={item.label} type="button" className="sc-menu__item" onClick={item.onClick}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
