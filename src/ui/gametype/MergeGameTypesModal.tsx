import { useTranslation } from 'react-i18next'
import type { MergeGameTypesPreview } from '../../application/mergeGameTypesUseCase'
import type { GameType } from '../../domain/model/gameType'
import { MergeSelectModal } from '../shared/MergeSelectModal'

export interface MergeGameTypesModalProps {
  open: boolean
  /** Archived game types included — a duplicate is often archived before being merged. */
  gameTypes: GameType[]
  keptId: string | undefined
  duplicateIds: string[]
  /** undefined until a kept game type and at least one duplicate are picked. */
  preview: MergeGameTypesPreview | undefined
  error: string | undefined
  onSelectKept: (id: string | undefined) => void
  onToggleDuplicate: (id: string) => void
  onClose: () => void
  onConfirmMerge: () => void
}

export function MergeGameTypesModal({
  open,
  gameTypes,
  keptId,
  duplicateIds,
  preview,
  error,
  onSelectKept,
  onToggleDuplicate,
  onClose,
  onConfirmMerge,
}: MergeGameTypesModalProps) {
  const { t } = useTranslation()

  const options = gameTypes.map((gameType) => ({
    id: gameType.id,
    label: gameType.name,
    note: gameType.active ? undefined : t('gametype.archivedNote'),
  }))

  const keptName = gameTypes.find((gt) => gt.id === keptId)?.name ?? ''

  return (
    <MergeSelectModal
      open={open}
      title={t('gametype.mergeTitle')}
      body={t('gametype.mergeBody')}
      keptLabel={t('gametype.mergeKeptLabel')}
      duplicatesLabel={t('gametype.mergeDuplicatesLabel')}
      placeholder={t('gametype.mergeSelectPlaceholder')}
      options={options}
      keptId={keptId}
      duplicateIds={duplicateIds}
      onSelectKept={onSelectKept}
      onToggleDuplicate={onToggleDuplicate}
      summary={preview && t('gametype.mergeSummary', { count: preview.affectedMatches })}
      warning={preview?.rulesDiffer ? t('gametype.mergeRulesDiffer', { name: keptName }) : undefined}
      confirmText={t('gametype.mergeConfirm')}
      error={error}
      onClose={onClose}
      onConfirm={onConfirmMerge}
    />
  )
}
