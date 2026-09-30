import {
  Badge,
  Button,
  EmptyState,
  Icon,
  List,
  ListRow,
  Stack,
  Text,
} from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { Player } from '../../domain/model/player'

export interface PlayerListSectionProps {
  players: Player[]
  stats: Map<string, PlayerStats>
  /** Player id -> number of trophies held; no badge below 1. */
  trophyCounts: Map<string, number>
  selectedPlayers: Set<string>
  onToggleSelect: (playerId: string) => void
  onEditPlayer: (playerId: string) => void
  onDeleteRequest: (playerId: string) => void
  cleanupCandidatesCount: number
  onShowCleanupConfirm: () => void
  /** Players eligible for a merge, soft-deleted ones included — merging needs at least 2. */
  mergeCandidatesCount: number
  onShowMergeDialog: () => void
}

export function PlayerListSection({
  players,
  stats,
  trophyCounts,
  selectedPlayers,
  onToggleSelect,
  onEditPlayer,
  onDeleteRequest,
  cleanupCandidatesCount,
  onShowCleanupConfirm,
  mergeCandidatesCount,
  onShowMergeDialog,
}: PlayerListSectionProps) {
  const { t } = useTranslation()

  return (
    <Stack gap={3}>
      {players.length === 0 ? (
        <EmptyState>{t('home.noPlayersYet')}</EmptyState>
      ) : (
        <List>
          {players.map((player) => {
            const playerStats = stats.get(player.id)
            const trophyCount = trophyCounts.get(player.id) ?? 0
            return (
              <ListRow
                key={player.id}
                title={player.name}
                subtitle={playerStats ? `${playerStats.wins}W ${playerStats.losses}L` : undefined}
                badge={
                  trophyCount > 0 ? (
                    <Badge tone="accent" ariaLabel={t('home.trophyCount', { count: trophyCount })}>
                      <Icon name="trophy" size="sm" />
                      {trophyCount}
                    </Badge>
                  ) : undefined
                }
                selectable
                selected={selectedPlayers.has(player.id)}
                onSelect={() => onToggleSelect(player.id)}
                actions={[
                  { icon: 'edit', label: 'Edit', onClick: () => onEditPlayer(player.id) },
                  {
                    icon: 'delete',
                    label: 'Delete',
                    tone: 'danger',
                    onClick: () => onDeleteRequest(player.id),
                  },
                ]}
              />
            )
          })}
        </List>
      )}

      {players.length > 0 && selectedPlayers.size < 2 && (
        <Text variant="hint" align="center" block>
          {t('home.playersSelected', { count: selectedPlayers.size })}
        </Text>
      )}

      {(mergeCandidatesCount >= 2 || cleanupCandidatesCount > 0) && (
        <Stack direction="row" gap={2} justify="center" wrap>
          {mergeCandidatesCount >= 2 && (
            <Button variant="secondary" icon="merge" onClick={onShowMergeDialog}>
              {t('home.merge')}
            </Button>
          )}
          {cleanupCandidatesCount > 0 && (
            <Button variant="secondary" icon="sparkles" onClick={onShowCleanupConfirm}>
              {t('home.cleanUp', { count: cleanupCandidatesCount })}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  )
}
