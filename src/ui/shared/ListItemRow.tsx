const TITLE_VIEW_DETAIL = 'View details'
const TITLE_EDIT = 'Edit'
const TITLE_DELETE = 'Delete'

export interface ListItemRowProps {
  label: string
  subtitle?: string
  /** Shows the ○/● picto. */
  isSelectable?: boolean
  /** ● if true, ○ if false. */
  isSelected?: boolean
  /** undefined = passive label zone (no pointer cursor). */
  onSelect?: () => void
  /** undefined = no 👁 button. */
  onView?: () => void
  /** undefined = no ✏ button. */
  onEdit?: () => void
  /** undefined = no 🗑 button. */
  onDelete?: () => void
}

export function ListItemRow({
  label,
  subtitle,
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
        </div>
      </div>

      <div className="list-item-actions">
        {onView && (
          <button
            type="button"
            className="btn-icon"
            title={TITLE_VIEW_DETAIL}
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
          >
            👁
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            className="btn-icon"
            title={TITLE_EDIT}
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            ✏
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            title={TITLE_DELETE}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
