import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LudoButton } from './LudoButton'
import { LudoModal } from './LudoModal'

export interface MergeSelectOption {
  id: string
  /** Already decorated for display — e.g. suffixed with "(deleted)" / "(archived)". */
  label: string
}

export interface MergeSelectModalProps {
  open: boolean
  title: string
  /** One sentence stating what the merge does, above the two pickers. */
  body: string
  duplicateLabel: string
  keptLabel: string
  placeholder: string
  options: MergeSelectOption[]
  duplicateId: string | undefined
  keptId: string | undefined
  onSelectDuplicate: (id: string | undefined) => void
  onSelectKept: (id: string | undefined) => void
  /** What the merge would do, e.g. how many matches move. Rendered once both sides are picked. */
  summary?: ReactNode
  /** Caveat shown alongside the summary — informative unless `blocked`, which paints it as a blocker. */
  warning?: ReactNode
  /** Keeps confirmation disabled despite both sides being picked. */
  blocked?: boolean
  confirmText: string
  error: string | undefined
  onClose: () => void
  onConfirm: () => void
}

/**
 * Two-picker merge dialog shared by the player and game-type merges: pick the
 * duplicate to absorb, pick the one to keep, read what it would do, confirm.
 * The duplicate is excluded from the "keep" list, so the two can never name the
 * same entity.
 */
export function MergeSelectModal({
  open,
  title,
  body,
  duplicateLabel,
  keptLabel,
  placeholder,
  options,
  duplicateId,
  keptId,
  onSelectDuplicate,
  onSelectKept,
  summary,
  warning,
  blocked = false,
  confirmText,
  error,
  onClose,
  onConfirm,
}: MergeSelectModalProps) {
  const { t } = useTranslation()
  const bothPicked = duplicateId !== undefined && keptId !== undefined

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
            disabled={!bothPicked || blocked}
            onClick={onConfirm}
          />
        </>
      }
    >
      <div className="modal-body">{body}</div>

      <div className="section-label">{duplicateLabel}</div>
      <div className="select-chevron">
        <select
          className="select"
          aria-label={duplicateLabel}
          value={duplicateId ?? ''}
          onChange={(e) => onSelectDuplicate(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="section-label">{keptLabel}</div>
      <div className="select-chevron">
        <select
          className="select"
          aria-label={keptLabel}
          value={keptId ?? ''}
          onChange={(e) => onSelectKept(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options
            .filter((option) => option.id !== duplicateId)
            .map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
        </select>
      </div>

      {bothPicked && summary && <div className="merge-summary">{summary}</div>}
      {bothPicked && warning && (
        <div className={blocked ? 'merge-warning merge-warning--blocking' : 'merge-warning'}>{warning}</div>
      )}
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
