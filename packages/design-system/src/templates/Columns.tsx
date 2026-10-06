import type { ReactNode } from 'react'

/**
 * The capped, padded column an `<ImmersiveTemplate>`'s content is laid in — what
 * a scoring module wraps its screen in. Wider than `<ScreenTemplate>`'s 600px so
 * that two `<Columns>` fit side by side; children are stacked with the screen gap.
 */
export function WideLayout({ children }: { children: ReactNode }) {
  return <div className="sc-wide">{children}</div>
}

/**
 * Two `<Column>`s side by side once the screen is wide enough to hold them
 * (900px), stacked otherwise — e.g. a module's scoreboard next to the turn
 * being counted.
 */
export function Columns({ children }: { children: ReactNode }) {
  return <div className="sc-columns">{children}</div>
}

/** One column of `<Columns>`: a region landmark named after what it holds. */
export function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="sc-column" aria-label={label}>
      {children}
    </section>
  )
}
