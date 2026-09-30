import type { ReactNode } from 'react'
import {
  Button,
  ButtonRow,
  Dialog,
  List,
  ListRow,
  Select,
  Stack,
  Text,
} from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'

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
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!selectionComplete || blocked} onClick={onConfirm}>
            {confirmText}
          </Button>
        </ButtonRow>
      }
    >
      <Text block>{body}</Text>

      <Select
        label={keptLabel}
        value={keptId ?? ''}
        placeholder={placeholder}
        options={options.map((option) => ({ value: option.id, label: optionText(option) }))}
        onChange={(id) => onSelectKept(id === '' ? undefined : id)}
      />

      <Stack gap={2}>
        <Text variant="label">{duplicatesLabel}</Text>
        <List>
          {candidates.map((option) => (
            <ListRow
              key={option.id}
              title={option.label}
              subtitle={option.note}
              selectable
              selected={duplicateIds.includes(option.id)}
              onSelect={() => onToggleDuplicate(option.id)}
            />
          ))}
        </List>
      </Stack>

      {selectionComplete && summary && <Text block>{summary}</Text>}
      {selectionComplete && warning && (
        <Text variant={blocked ? 'error' : 'warning'}>{warning}</Text>
      )}
      {error && <Text variant="error">{error}</Text>}
    </Dialog>
  )
}
