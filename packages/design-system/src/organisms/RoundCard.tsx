import type { ReactNode } from 'react'

export interface RoundCardProps {
  title: ReactNode
  /** Right side of the head, e.g. a small action. */
  trailing?: ReactNode
  /** `<HistoryCell>`s — they wrap, so the card grows downward instead of scrolling sideways. */
  children: ReactNode
}

export function RoundCard({ title, trailing, children }: RoundCardProps) {
  return (
    <section className="sc-round">
      <header className="sc-round__head">
        <span>{title}</span>
        {trailing}
      </header>
      <div className="sc-round__cells">{children}</div>
    </section>
  )
}
