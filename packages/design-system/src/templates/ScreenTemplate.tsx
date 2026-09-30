import type { ReactNode } from 'react'
import { cx } from '../cx'

export interface ScreenTemplateProps {
  /** An `<AppHeader>`. */
  header: ReactNode
  /** The screen's organisms; the content column scrolls. */
  children: ReactNode
  /**
   * An `<ActionBar>`. Its presence reserves room at the bottom so the last row
   * never hides behind it. Screens without one are the "scrolling list"
   * template, screens with one the "list + action bar" template.
   */
  actionBar?: ReactNode
  /** Dialogs, sheets and the side menu — rendered above everything. */
  overlays?: ReactNode
}

/** Header, a scrolling 600px content column, an optional action bar. Every host screen is one. */
export function ScreenTemplate({ header, children, actionBar, overlays }: ScreenTemplateProps) {
  return (
    <>
      {header}
      <main className={cx('sc-screen', actionBar !== undefined && 'sc-screen--with-bar')}>
        {children}
      </main>
      {actionBar}
      {overlays}
    </>
  )
}

export interface ImmersiveTemplateProps {
  /** Name of what fills the screen, e.g. the module's game. */
  title: ReactNode
  /** The one way back — always present, even if the content fails to load. */
  exit: { label: string; onClick: () => void }
  children: ReactNode
}

/**
 * For content that brings its own chrome (a scoring module): no host header,
 * just a fine bar with the way out, and the content taking the rest.
 */
export function ImmersiveTemplate({ title, exit, children }: ImmersiveTemplateProps) {
  return (
    <div className="sc-immersive">
      <div className="sc-immersive__bar">
        <span className="sc-immersive__title">{title}</span>
        <button type="button" className="sc-immersive__exit" onClick={exit.onClick}>
          {exit.label}
        </button>
      </div>
      <div className="sc-immersive__content">{children}</div>
    </div>
  )
}
