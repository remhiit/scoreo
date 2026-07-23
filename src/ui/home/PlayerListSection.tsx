import { Sparkles } from 'lucide-react'
import type { PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { Player } from '../../domain/model/player'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'

export interface PlayerListSectionProps {
  players: Player[]
  stats: Map<string, PlayerStats>
  selectedPlayers: Set<string>
  onToggleSelect: (playerId: string) => void
  onEditPlayer: (playerId: string) => void
  onDeleteRequest: (playerId: string) => void
  cleanupCandidatesCount: number
  onShowCleanupConfirm: () => void
}

export function PlayerListSection({
  players,
  stats,
  selectedPlayers,
  onToggleSelect,
  onEditPlayer,
  onDeleteRequest,
  cleanupCandidatesCount,
  onShowCleanupConfirm,
}: PlayerListSectionProps) {
  return (
    <>
      {players.length === 0 ? (
        <div className="empty">No players yet. Add one above.</div>
      ) : (
        <ListContainer>
          {players.map((player) => {
            const isSelected = selectedPlayers.has(player.id)
            const playerStats = stats.get(player.id)
            const subtitle = playerStats ? `${playerStats.wins}W ${playerStats.losses}L` : undefined
            return (
              <ListItemRow
                key={player.id}
                label={player.name}
                subtitle={subtitle}
                isSelectable
                isSelected={isSelected}
                onSelect={() => onToggleSelect(player.id)}
                onEdit={() => onEditPlayer(player.id)}
                onDelete={() => onDeleteRequest(player.id)}
              />
            )
          })}
        </ListContainer>
      )}

      {players.length > 0 && selectedPlayers.size < 2 && (
        <div className="selection-hint">{selectedPlayers.size}/2 players selected</div>
      )}

      {cleanupCandidatesCount > 0 && (
        <LudoButton
          text={
            <>
              <Sparkles size={16} aria-hidden /> Clean up ({cleanupCandidatesCount})
            </>
          }
          variant="secondary"
          onClick={onShowCleanupConfirm}
        />
      )}
    </>
  )
}
