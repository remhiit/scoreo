import { useTranslation } from 'react-i18next'
import type { MergePlayersPreview } from '../../application/mergePlayersUseCase'
import type { Player } from '../../domain/model/player'
import { MergeSelectModal } from '../shared/MergeSelectModal'

export interface MergePlayersModalProps {
  open: boolean
  /** Soft-deleted players included — an import can duplicate an already-deleted player. */
  players: Player[]
  keptId: string | undefined
  duplicateIds: string[]
  /** undefined until a kept player and at least one duplicate are picked. */
  preview: MergePlayersPreview | undefined
  error: string | undefined
  onSelectKept: (id: string | undefined) => void
  onToggleDuplicate: (id: string) => void
  onClose: () => void
  onConfirmMerge: () => void
}

export function MergePlayersModal({
  open,
  players,
  keptId,
  duplicateIds,
  preview,
  error,
  onSelectKept,
  onToggleDuplicate,
  onClose,
  onConfirmMerge,
}: MergePlayersModalProps) {
  const { t } = useTranslation()

  const options = players.map((player) => ({
    id: player.id,
    label: player.name || t('home.unnamedPlayer'),
    note: player.active ? undefined : t('home.deletedNote'),
  }))

  const blocked = preview !== undefined && preview.conflictingMatches > 0

  return (
    <MergeSelectModal
      open={open}
      title={t('home.mergeTitle')}
      body={t('home.mergeBody')}
      keptLabel={t('home.mergeKeptLabel')}
      duplicatesLabel={t('home.mergeDuplicatesLabel')}
      placeholder={t('home.mergeSelectPlaceholder')}
      options={options}
      keptId={keptId}
      duplicateIds={duplicateIds}
      onSelectKept={onSelectKept}
      onToggleDuplicate={onToggleDuplicate}
      summary={preview && t('home.mergeSummary', { count: preview.affectedMatches })}
      warning={blocked ? t('home.mergeConflict', { count: preview.conflictingMatches }) : undefined}
      blocked={blocked}
      confirmText={t('home.mergeConfirm')}
      error={error}
      onClose={onClose}
      onConfirm={onConfirmMerge}
    />
  )
}
