import type { CSSProperties, ReactNode } from 'react'

export interface LudoColumn<T> {
  header: string
  align?: CSSProperties['textAlign']
  render: (row: T) => ReactNode
}

export interface LudoTableProps<T> {
  columns: LudoColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  footer?: ReactNode
  striped?: boolean
  dense?: boolean
}

/**
 * Scoreboard grid: one column per player, one row per round, a pinned
 * totals row. Also works as a plain list table.
 */
export function LudoTable<T>({ columns, rows, rowKey, footer, striped = true, dense = false }: LudoTableProps<T>) {
  const classes = ['ludo-table']
  if (striped) classes.push('ludo-table--striped')
  if (dense) classes.push('ludo-table--dense')
  if (!footer) classes.push('ludo-table--no-footer')

  return (
    <table className={classes.join(' ')}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.header} style={col.align ? { textAlign: col.align } : undefined}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td key={col.header} style={col.align ? { textAlign: col.align } : undefined}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && (
        <tfoot>
          <tr>{footer}</tr>
        </tfoot>
      )}
    </table>
  )
}
