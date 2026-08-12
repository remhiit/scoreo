import { useState } from 'react'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { CleanupConfirmModal } from './CleanupConfirmModal'
import { DeletePlayerModal } from './DeletePlayerModal'
import type { PlayerAction, PlayerDataSources } from './playerReducer'
import { submitCleanup, submitConfirmRename, submitDeletePlayer } from './playerReducer'
import type { PlayerState } from './playerTypes'
import { RenamePlayerModal } from './RenamePlayerModal'

export interface PlayerActionModalsProps {
  state: PlayerState
  dispatch: (action: PlayerAction) => void
  deletePlayer: DeletePlayerUseCase
  renamePlayerUseCase: RenamePlayerUseCase
  sources: PlayerDataSources
}

export function PlayerActionModals({
  state,
  dispatch,
  deletePlayer,
  renamePlayerUseCase,
  sources,
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
            submitDeletePlayer(deletePlayer, sources, state.deleteConfirmPlayerId, anonymize),
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
          const action = submitConfirmRename(renamePlayerUseCase, sources, state)
          if (action) dispatch(action)
        }}
      />

      <CleanupConfirmModal
        open={state.showCleanupConfirm}
        candidates={state.cleanupCandidates}
        onClose={() => dispatch({ type: 'dismissCleanupConfirm' })}
        onConfirmCleanup={() => dispatch(submitCleanup(sources))}
      />
    </>
  )
}
