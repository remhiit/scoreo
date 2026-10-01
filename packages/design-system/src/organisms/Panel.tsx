import { useId, type ReactNode } from 'react'

export interface PanelProps {
  title: ReactNode
  /** One muted line under the title: what the section is about. */
  description?: ReactNode
  /** Right side of the head, e.g. a `<Badge>`. */
  trailing?: ReactNode
  children?: ReactNode
}

/** A titled section on a card — a trophy, a player's record. A `region` named by its title. */
export function Panel({ title, description, trailing, children }: PanelProps) {
  const titleId = useId()
  return (
    <section className="sc-panel" aria-labelledby={titleId}>
      <header className="sc-panel__head">
        <div className="sc-panel__heading">
          <h2 id={titleId} className="sc-panel__title">
            {title}
          </h2>
          {description !== undefined && <p className="sc-panel__description">{description}</p>}
        </div>
        {trailing}
      </header>
      {children !== undefined && <div className="sc-panel__body">{children}</div>}
    </section>
  )
}
