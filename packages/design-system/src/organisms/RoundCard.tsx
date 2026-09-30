import { useId, type ReactNode } from 'react'

export interface RoundCardProps {
  title: ReactNode
  /** Right side of the head, e.g. a small action. */
  trailing?: ReactNode
  /** `<HistoryCell>`s — they wrap, so the card grows downward instead of scrolling sideways. */
  children: ReactNode
}

/** A `region` named by its title, so a round is reachable as "Round 3". */
export function RoundCard({ title, trailing, children }: RoundCardProps) {
  const titleId = useId()
  return (
    <section className="sc-round" aria-labelledby={titleId}>
      <header className="sc-round__head">
        <span id={titleId}>{title}</span>
        {trailing}
      </header>
      <div className="sc-round__cells">{children}</div>
    </section>
  )
}
