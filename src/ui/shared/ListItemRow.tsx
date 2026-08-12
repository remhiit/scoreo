import type { ReactNode } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { LudoButton } from './LudoButton'

const LABEL_VIEW_DETAIL = 'View details'
const LABEL_EDIT = 'Edit'
const LABEL_DELETE = 'Delete'

export interface ListItemRowProps {
  label: string
  subtitle?: string
  /** Rendered in `.list-item-players` — e.g. per-player scores. */
  players?: ReactNode
  /** Rendered in `.list-item-date`. */
  date?: ReactNode
  /** Rendered in `.list-item-badge`, at the end of the label zone — e.g. a trophy count. */
  badge?: ReactNode
  /** Accessible name for the badge, since its content is usually a picto + a number. */
  badgeLabel?: string
  /** Shows the ○/● picto. */
  isSelectable?: boolean
  /** ● if true, ○ if false. */
  isSelected?: boolean
  /** undefined = passive label zone (no pointer cursor). */
  onSelect?: () => void
  /** undefined = no Eye button. */
  onView?: () => void
  /** undefined = no Pencil button. */
  onEdit?: () => void
  /** undefined = no Trash button. */
  onDelete?: () => void
}

export function ListItemRow({
  label,
  subtitle,
  players,
  date,
  badge,
  badgeLabel,
  isSelectable = false,
  isSelected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: ListItemRowProps) {
  const labelClasses = ['list-item-label']
  if (onSelect) labelClasses.push('list-item-label--selectable')
  if (isSelected) labelClasses.push('list-item-label--selected')

  return (
    <div className="list-item-row">
      <div className={labelClasses.join(' ')} onClick={onSelect}>
        {isSelectable && <span className="list-item-select-picto">{isSelected ? '●' : '○'}</span>}
        <div>
          <span className="list-item-name">{label}</span>
          {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
          {players && <span className="list-item-players">{players}</span>}
          {date && <span className="list-item-date">{date}</span>}
        </div>
        {badge && (
          <span className="list-item-badge" aria-label={badgeLabel}>
            {badge}
          </span>
        )}
      </div>

      <div className="list-item-actions">
        {onView && (
          <LudoButton
            text={<Eye size={18} aria-hidden />}
            variant="ghost"
            size="sm"
            iconOnly
            ariaLabel={LABEL_VIEW_DETAIL}
            onClick={onView}
          />
        )}
        {onEdit && (
          <LudoButton
            text={<Pencil size={18} aria-hidden />}
            variant="ghost"
            size="sm"
            iconOnly
            ariaLabel={LABEL_EDIT}
            onClick={onEdit}
          />
        )}
        {onDelete && (
          <LudoButton
            text={<Trash2 size={18} aria-hidden />}
            variant="danger"
            size="sm"
            iconOnly
            ariaLabel={LABEL_DELETE}
            onClick={onDelete}
          />
        )}
      </div>
    </div>
  )
}
