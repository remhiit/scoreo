import { useMemo, useState } from 'react'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { MergePlayersUseCase } from '../../application/mergePlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { CleanupConfirmModal } from './CleanupConfirmModal'
import { DeletePlayerModal } from './DeletePlayerModal'
import { MergePlayersModal } from './MergePlayersModal'
import type { PlayerAction, PlayerDataSources } from './playerReducer'
import { submitCleanup, submitConfirmRename, submitDeletePlayer, submitMergePlayers } from './playerReducer'
import type { PlayerState } from './playerTypes'
import { RenamePlayerModal } from './RenamePlayerModal'

export interface PlayerActionModalsProps {
  state: PlayerState
  dispatch: (action: PlayerAction) => void
  deletePlayer: DeletePlayerUseCase
  renamePlayerUseCase: RenamePlayerUseCase
  mergePlayersUseCase: MergePlayersUseCase
  sources: PlayerDataSources
}

export function PlayerActionModals({
  state,
  dispatch,
  deletePlayer,
  renamePlayerUseCase,
  mergePlayersUseCase,
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

  // Read-only projection of the pending merge, recomputed whenever either side
  // changes — the mutation itself stays in submitMergePlayers.
  const mergePreview = useMemo(() => {
    if (state.mergeDuplicateId === undefined || state.mergeKeptId === undefined) return undefined
    return mergePlayersUseCase.preview(state.mergeDuplicateId, state.mergeKeptId)
  }, [mergePlayersUseCase, state.mergeDuplicateId, state.mergeKeptId])

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

      <MergePlayersModal
        open={state.showMergeDialog}
        players={state.allPlayers}
        duplicateId={state.mergeDuplicateId}
        keptId={state.mergeKeptId}
        preview={mergePreview}
        error={state.mergeError}
        onSelectDuplicate={(id) => dispatch({ type: 'selectMergeDuplicate', id })}
        onSelectKept={(id) => dispatch({ type: 'selectMergeKept', id })}
        onClose={() => dispatch({ type: 'dismissMergeDialog' })}
        onConfirmMerge={() => {
          const action = submitMergePlayers(mergePlayersUseCase, sources, state)
          if (action) dispatch(action)
        }}
      />
    </>
  )
}
