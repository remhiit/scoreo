import { useId, type ReactNode } from 'react'
import { cx } from '../cx'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/icons'
import { InListContext, useInList } from './listContext'

export interface RowAction {
  icon: IconName
  /** Accessible name — the action is icon-only. */
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
}

export interface ListRowProps {
  title: ReactNode
  /** One muted line under the title, e.g. `12W 5L`. */
  subtitle?: ReactNode
  /** Match row: players with the winner(s) in `<Text variant="strong">`. */
  players?: ReactNode
  /** Match row: the date line. */
  date?: ReactNode
  /** Trailing pill at the end of the label zone, e.g. a trophy count. */
  badge?: ReactNode
  /** Makes the label zone a toggle; `selected` then tints the whole row. */
  selectable?: boolean
  selected?: boolean
  /** Calls the row out, e.g. the match that was just saved. */
  highlighted?: boolean
  /** Label-zone tap. Without it the label is passive text. */
  onSelect?: () => void
  /** Square icon actions, flush to the row edge, full row height. */
  actions?: RowAction[]
  /**
   * Accessible name of the row as a list item. Defaults to the visible title,
   * which is enough when `title` is plain text (e.g. the player's name).
   */
  label?: string
}

/**
 * The row that carries most of the app. The accent tint alone shows selection —
 * no bullet — and covers the whole row, actions included. The label zone is one
 * edge-to-edge tap target.
 */
export function ListRow({
  title,
  subtitle,
  players,
  date,
  badge,
  selectable = false,
  selected = false,
  highlighted = false,
  onSelect,
  actions = [],
  label,
}: ListRowProps) {
  const inList = useInList()
  const titleId = useId()
  const text = (
    <span className="sc-row__text">
      <span id={titleId} className="sc-row__title">
        {title}
      </span>
      {subtitle !== undefined && <span className="sc-row__subtitle">{subtitle}</span>}
      {players !== undefined && <span className="sc-row__players">{players}</span>}
      {date !== undefined && <span className="sc-row__date">{date}</span>}
    </span>
  )
  const content = (
    <>
      {text}
      {badge !== undefined && <span className="sc-row__badge">{badge}</span>}
    </>
  )
  return (
    <div
      className={cx(
        'sc-row',
        selectable && selected && 'sc-row--selected',
        highlighted && 'sc-row--highlighted',
      )}
      role={inList ? 'listitem' : undefined}
      aria-label={inList ? label : undefined}
      aria-labelledby={inList && label === undefined ? titleId : undefined}
    >
      {onSelect ? (
        <button
          type="button"
          className="sc-row__label sc-row__label--interactive"
          aria-pressed={selectable ? selected : undefined}
          onClick={onSelect}
        >
          {content}
        </button>
      ) : (
        <div className="sc-row__label">{content}</div>
      )}
      {actions.length > 0 && (
        <div className="sc-row__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={cx('sc-row__action', action.tone === 'danger' && 'sc-row__action--danger')}
              aria-label={action.label}
              title={action.label}
              onClick={action.onClick}
            >
              <Icon name={action.icon} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export interface ListProps {
  children: ReactNode
}

/**
 * Vertical run of rows, 8px apart. Exposed as a `list` whose rows are its
 * `listitem`s, so assistive tech announces the list and its length, and a row
 * can be found by name (`getByRole('listitem', { name: 'Alice' })`).
 */
export function List({ children }: ListProps) {
  return (
    <div className="sc-list" role="list">
      <InListContext.Provider value={true}>{children}</InListContext.Provider>
    </div>
  )
}
