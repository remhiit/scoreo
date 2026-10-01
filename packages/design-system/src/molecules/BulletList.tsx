import type { ReactNode } from 'react'

/** The records a destructive dialog affects, one per line — the sentence alone is not enough for an erasure. */
export function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="sc-bullets">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
