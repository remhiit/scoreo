import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ListContainer } from './ListContainer'
import { ListItemRow } from './ListItemRow'
import { LudoButton } from './LudoButton'
import { LudoModal } from './LudoModal'

export interface MergeSelectOption {
  id: string
  label: string
  /** Qualifier rendered next to the label — e.g. "(deleted)" / "(archived)". */
  note?: string
}

export interface MergeSelectModalProps {
  open: boolean
  title: string
  /** One sentence stating what the merge does, above the pickers. */
  body: string
  keptLabel: string
  duplicatesLabel: string
  placeholder: string
  options: MergeSelectOption[]
  keptId: string | undefined
  duplicateIds: string[]
  onSelectKept: (id: string | undefined) => void
  onToggleDuplicate: (id: string) => void
  /** What the merge would do, e.g. how many matches move. Rendered once the selection is complete. */
  summary?: ReactNode
  /** Caveat shown alongside the summary — informative unless `blocked`, which paints it as a blocker. */
  warning?: ReactNode
  /** Keeps confirmation disabled despite a complete selection. */
  blocked?: boolean
  confirmText: string
  error: string | undefined
  onClose: () => void
  onConfirm: () => void
}

function optionText(option: MergeSelectOption): string {
  return option.note ? `${option.label} ${option.note}` : option.label
}

/**
 * Merge dialog shared by the player and game-type merges: one dropdown for the
 * entity to keep, then a multi-select list of the duplicates to fold into it —
 * an import can spell the same name three ways, so several duplicates go in one
 * pass. The kept entity is filtered out of the duplicates list, so it can never
 * be its own duplicate.
 */
export function MergeSelectModal({
  open,
  title,
  body,
  keptLabel,
  duplicatesLabel,
  placeholder,
  options,
  keptId,
  duplicateIds,
  onSelectKept,
  onToggleDuplicate,
  summary,
  warning,
  blocked = false,
  confirmText,
  error,
  onClose,
  onConfirm,
}: MergeSelectModalProps) {
  const { t } = useTranslation()
  const candidates = options.filter((option) => option.id !== keptId)
  const selectionComplete = keptId !== undefined && duplicateIds.length > 0

  return (
    <LudoModal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onClose} />
          <LudoButton
            text={confirmText}
            variant="primary"
            disabled={!selectionComplete || blocked}
            onClick={onConfirm}
          />
        </>
      }
    >
      <div className="modal-body">{body}</div>

      <div className="section-label">{keptLabel}</div>
      <div className="select-chevron">
        <select
          className="select"
          aria-label={keptLabel}
          value={keptId ?? ''}
          onChange={(e) => onSelectKept(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {optionText(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="section-label">{duplicatesLabel}</div>
      <ListContainer>
        {candidates.map((option) => (
          <ListItemRow
            key={option.id}
            label={option.label}
            subtitle={option.note}
            isSelectable
            isSelected={duplicateIds.includes(option.id)}
            onSelect={() => onToggleDuplicate(option.id)}
          />
        ))}
      </ListContainer>

      {selectionComplete && summary && <div className="merge-summary">{summary}</div>}
      {selectionComplete && warning && (
        <div className={blocked ? 'merge-warning merge-warning--blocking' : 'merge-warning'}>{warning}</div>
      )}
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
