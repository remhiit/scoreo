import { useTranslation } from 'react-i18next'
import type { MergePlayersPreview } from '../../application/mergePlayersUseCase'
import type { Player } from '../../domain/model/player'
import { MergeSelectModal } from '../shared/MergeSelectModal'

export interface MergePlayersModalProps {
  open: boolean
  /** Soft-deleted players included — an import can duplicate an already-deleted player. */
  players: Player[]
  duplicateId: string | undefined
  keptId: string | undefined
  /** undefined until both sides are picked. */
  preview: MergePlayersPreview | undefined
  error: string | undefined
  onSelectDuplicate: (id: string | undefined) => void
  onSelectKept: (id: string | undefined) => void
  onClose: () => void
  onConfirmMerge: () => void
}

export function MergePlayersModal({
  open,
  players,
  duplicateId,
  keptId,
  preview,
  error,
  onSelectDuplicate,
  onSelectKept,
  onClose,
  onConfirmMerge,
}: MergePlayersModalProps) {
  const { t } = useTranslation()

  const options = players.map((player) => {
    const name = player.name || t('home.unnamedPlayer')
    return { id: player.id, label: player.active ? name : t('home.deletedSuffix', { name }) }
  })

  const blocked = preview !== undefined && preview.conflictingMatches > 0

  return (
    <MergeSelectModal
      open={open}
      title={t('home.mergeTitle')}
      body={t('home.mergeBody')}
      duplicateLabel={t('home.mergeDuplicateLabel')}
      keptLabel={t('home.mergeKeptLabel')}
      placeholder={t('home.mergeSelectPlaceholder')}
      options={options}
      duplicateId={duplicateId}
      keptId={keptId}
      onSelectDuplicate={onSelectDuplicate}
      onSelectKept={onSelectKept}
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
