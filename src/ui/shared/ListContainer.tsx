import type { ReactNode } from 'react'

export function ListContainer({ className, children }: { className?: string; children: ReactNode }) {
  const classes = ['list-container']
  if (className) classes.push(className)
  return <div className={classes.join(' ')}>{children}</div>
}
