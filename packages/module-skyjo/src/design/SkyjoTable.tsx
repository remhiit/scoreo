import './SkyjoTable.css'

export interface SkyjoTableCell {
  /** What the cell shows, e.g. `20 ×2`. */
  text: string
  /** The ender's score was doubled: drawn as a penalty. */
  doubled?: boolean
}

export interface SkyjoTableRow {
  label: string
  cells: readonly SkyjoTableCell[]
}

export interface SkyjoTableTotal {
  value: number
  /** Lowest total still in play — lower wins in Skyjo. */
  leading: boolean
}

export interface SkyjoTableProps {
  playerNames: readonly string[]
  rows: readonly SkyjoTableRow[]
  totals: readonly SkyjoTableTotal[]
  totalLabel: string
  emptyLabel: string
  doubledLabel: string
}

/** The round log, one column per player, with the running totals underneath. */
export function SkyjoTable({
  playerNames,
  rows,
  totals,
  totalLabel,
  emptyLabel,
  doubledLabel,
}: SkyjoTableProps) {
  return (
    <div className="sj-table-wrap">
      <table className="sj-table">
        <thead>
          <tr>
            <th scope="col" />
            {playerNames.map((name, index) => (
              <th scope="col" key={index}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <th scope="row" className="sj-round-label">
                {row.label}
              </th>
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cell.doubled ? 'sj-cell-doubled' : undefined}
                  title={cell.doubled ? doubledLabel : undefined}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="sj-empty" colSpan={playerNames.length + 1}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="sj-round-label">
              {totalLabel}
            </th>
            {totals.map((total, index) => (
              <td key={index} className={total.leading ? 'sj-total sj-leading' : 'sj-total'}>
                {total.value}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
