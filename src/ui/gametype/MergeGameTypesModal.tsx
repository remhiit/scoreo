import { useTranslation } from 'react-i18next'
import type { MergeGameTypesPreview } from '../../application/mergeGameTypesUseCase'
import type { GameType } from '../../domain/model/gameType'
import { MergeSelectModal } from '../shared/MergeSelectModal'

export interface MergeGameTypesModalProps {
  open: boolean
  /** Archived game types included — a duplicate is often archived before being merged. */
  gameTypes: GameType[]
  duplicateId: string | undefined
  keptId: string | undefined
  /** undefined until both sides are picked. */
  preview: MergeGameTypesPreview | undefined
  error: string | undefined
  onSelectDuplicate: (id: string | undefined) => void
  onSelectKept: (id: string | undefined) => void
  onClose: () => void
  onConfirmMerge: () => void
}

export function MergeGameTypesModal({
  open,
  gameTypes,
  duplicateId,
  keptId,
  preview,
  error,
  onSelectDuplicate,
  onSelectKept,
  onClose,
  onConfirmMerge,
}: MergeGameTypesModalProps) {
  const { t } = useTranslation()

  const options = gameTypes.map((gameType) => ({
    id: gameType.id,
    label: gameType.active ? gameType.name : t('gametype.archivedSuffix', { name: gameType.name }),
  }))

  const keptName = gameTypes.find((gt) => gt.id === keptId)?.name ?? ''

  return (
    <MergeSelectModal
      open={open}
      title={t('gametype.mergeTitle')}
      body={t('gametype.mergeBody')}
      duplicateLabel={t('gametype.mergeDuplicateLabel')}
      keptLabel={t('gametype.mergeKeptLabel')}
      placeholder={t('gametype.mergeSelectPlaceholder')}
      options={options}
      duplicateId={duplicateId}
      keptId={keptId}
      onSelectDuplicate={onSelectDuplicate}
      onSelectKept={onSelectKept}
      summary={preview && t('gametype.mergeSummary', { count: preview.affectedMatches })}
      warning={preview?.rulesDiffer ? t('gametype.mergeRulesDiffer', { name: keptName }) : undefined}
      confirmText={t('gametype.mergeConfirm')}
      error={error}
      onClose={onClose}
      onConfirm={onConfirmMerge}
    />
  )
}
