import './ScoreTable.css'

/** How a coup reads in the grid: a plain score, a blank hand, a loss, an island. */
export type CellTone = 'default' | 'zero' | 'negative' | 'island'

/** What a total says: just a total, the one in the lead, past the 6000 line. */
export type TotalTone = 'default' | 'leading' | 'over'

export interface ScoreCell {
  text: string
  tone?: CellTone
  /** The coup's breakdown, on hover. */
  title?: string
}

export interface ScoreTableProps {
  /** Visually hidden name of the round column. */
  cornerLabel: string
  players: readonly { key: string; name: string }[]
  /** The player whose turn it is, underlined in the accent. */
  currentIndex: number
  rounds: readonly { label: string; cells: readonly ScoreCell[] }[]
  /** Shown across the grid while no coup has been played. */
  emptyLabel: string
  totalLabel: string
  totals: readonly { value: number; tone?: TotalTone }[]
}

/**
 * 1000 Sabords' scoreboard: one column per player, one row per round, the
 * totals in the footer. The design system has no grid of rounds by players —
 * Scoreo's own rounds are cards — so the table is this game's own piece.
 */
export function ScoreTable({
  cornerLabel,
  players,
  currentIndex,
  rounds,
  emptyLabel,
  totalLabel,
  totals,
}: ScoreTableProps) {
  return (
    <div className="ms-table-wrap">
      <table className="ms-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="ms-sr-only">{cornerLabel}</span>
            </th>
            {players.map((player, index) => (
              <th
                scope="col"
                key={player.key}
                className={index === currentIndex ? 'ms-current' : undefined}
                aria-current={index === currentIndex ? 'true' : undefined}
              >
                {player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, manche) => (
            <tr key={manche}>
              <th scope="row" className="ms-round-label">
                {round.label}
              </th>
              {round.cells.map((cell, index) => (
                <td
                  key={players[index]?.key ?? index}
                  className={`ms-cell ms-cell--${cell.tone ?? 'default'}`}
                  title={cell.title}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
          {rounds.length === 0 && (
            <tr>
              <td className="ms-empty" colSpan={players.length + 1}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="ms-round-label">
              {totalLabel}
            </th>
            {totals.map((total, index) => (
              <td
                key={players[index]?.key ?? index}
                className={`ms-total ms-total--${total.tone ?? 'default'}`}
              >
                {total.value}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
