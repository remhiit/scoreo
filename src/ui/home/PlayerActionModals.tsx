import { useState } from 'react'
import type { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { CleanupConfirmModal } from './CleanupConfirmModal'
import { DeletePlayerModal } from './DeletePlayerModal'
import type { PlayerAction } from './playerReducer'
import { submitCleanup, submitConfirmRename, submitDeletePlayer } from './playerReducer'
import type { PlayerState } from './playerTypes'
import { RenamePlayerModal } from './RenamePlayerModal'

export interface PlayerActionModalsProps {
  state: PlayerState
  dispatch: (action: PlayerAction) => void
  deletePlayer: DeletePlayerUseCase
  renamePlayerUseCase: RenamePlayerUseCase
  cleanupInactivePlayers: CleanupInactivePlayersUseCase
  getPlayers: GetPlayersUseCase
  getPlayerStats: GetPlayerStatsUseCase
}

export function PlayerActionModals({
  state,
  dispatch,
  deletePlayer,
  renamePlayerUseCase,
  cleanupInactivePlayers,
  getPlayers,
  getPlayerStats,
}: PlayerActionModalsProps) {
  const [anonymize, setAnonymize] = useState(false)
  const [prevDeleteConfirmPlayerId, setPrevDeleteConfirmPlayerId] = useState(
    state.deleteConfirmPlayerId,
  )
  if (prevDeleteConfirmPlayerId !== state.deleteConfirmPlayerId) {
    setPrevDeleteConfirmPlayerId(state.deleteConfirmPlayerId)
    setAnonymize(false)
  }

  const playerToDelete = state.deleteConfirmPlayerId
    ? state.players.find((p) => p.id === state.deleteConfirmPlayerId)
    : undefined
  const playerToRename = state.renamingPlayerId
    ? state.players.find((p) => p.id === state.renamingPlayerId)
    : undefined

  return (
    <>
      <DeletePlayerModal
        open={state.deleteConfirmPlayerId !== undefined}
        playerName={playerToDelete?.name}
        anonymize={anonymize}
        onToggleAnonymize={() => setAnonymize(!anonymize)}
        onClose={() => dispatch({ type: 'dismissDeleteConfirm' })}
        onConfirmDelete={() => {
          if (state.deleteConfirmPlayerId === undefined) return
          dispatch(
            submitDeletePlayer(
              deletePlayer,
              getPlayers,
              getPlayerStats,
              cleanupInactivePlayers,
              state.deleteConfirmPlayerId,
              anonymize,
            ),
          )
        }}
      />

      <RenamePlayerModal
        open={state.renamingPlayerId !== undefined && playerToRename !== undefined}
        playerName={playerToRename?.name}
        value={state.renameInput}
        onChange={(name) => dispatch({ type: 'updateRenameInput', name })}
        error={state.error}
        onClose={() => dispatch({ type: 'cancelRename' })}
        onConfirmRename={() => {
          const action = submitConfirmRename(
            renamePlayerUseCase,
            getPlayers,
            getPlayerStats,
            cleanupInactivePlayers,
            state,
          )
          if (action) dispatch(action)
        }}
      />

      <CleanupConfirmModal
        open={state.showCleanupConfirm}
        candidates={state.cleanupCandidates}
        onClose={() => dispatch({ type: 'dismissCleanupConfirm' })}
        onConfirmCleanup={() =>
          dispatch(submitCleanup(cleanupInactivePlayers, getPlayers, getPlayerStats))
        }
      />
    </>
  )
}
