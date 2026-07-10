import { useEffect, useReducer } from 'react'
import type { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import type { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import type { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import { tieBreakRuleLabel, winConditionLabel } from '../../domain/model/enums'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { GameTypeFields, GameTypeForm } from './GameTypeForm'
import {
  gameTypeReducer,
  loadGameTypes,
  resolveGameTypeForEdit,
  submitAddGameType,
  submitArchiveGameType,
  submitUpdateGameType,
} from './gameTypeReducer'
import { initialGameTypeState } from './gameTypeTypes'

export interface GameTypeScreenProps {
  addGameType: AddGameTypeUseCase
  updateGameType: UpdateGameTypeUseCase
  getGameTypes: GetGameTypesUseCase
  findGameTypeById: FindGameTypeByIdUseCase
  archiveGameType: ArchiveGameTypeUseCase
  showTitle?: boolean
}

export function GameTypeScreen({
  addGameType,
  updateGameType,
  getGameTypes,
  findGameTypeById,
  archiveGameType,
  showTitle = true,
}: GameTypeScreenProps) {
  const [state, dispatch] = useReducer(gameTypeReducer, initialGameTypeState)

  useEffect(() => {
    dispatch({ type: 'loaded', gameTypes: loadGameTypes(getGameTypes) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    const result = submitAddGameType(addGameType, getGameTypes, state)
    dispatch(
      'error' in result
        ? { type: 'addFailed', error: result.error }
        : { type: 'addSucceeded', gameTypes: result.gameTypes },
    )
  }

  const handleEdit = (id: string) => {
    const gameType = resolveGameTypeForEdit(findGameTypeById, id)
    if (gameType) dispatch({ type: 'editGameType', gameType })
  }

  const handleUpdate = () => {
    const editing = state.gameTypes.find((gt) => gt.id === state.editingGameId)
    if (!editing) return
    const updated = {
      ...editing,
      name: state.inputName.trim(),
      winCondition: state.selectedWinCondition,
      tieBreakRule: state.selectedTieBreakRule,
      tieBreakCondition: state.selectedTieBreakCondition,
      tieBreakLabel: state.selectedTieBreakLabel ?? null,
    }
    const result = submitUpdateGameType(updateGameType, getGameTypes, updated)
    dispatch(
      'error' in result
        ? { type: 'updateFailed', error: result.error }
        : { type: 'updateSucceeded', gameTypes: result.gameTypes },
    )
  }

  const handleArchive = (gameTypeId: string) => {
    const result = submitArchiveGameType(archiveGameType, getGameTypes, gameTypeId)
    dispatch(
      'error' in result
        ? { type: 'archiveFailed', error: result.error }
        : { type: 'archiveSucceeded', gameTypes: result.gameTypes },
    )
  }

  const selectedGameType = state.gameTypes.find((gt) => gt.id === state.selectedGameId)
  const editingGameType = state.gameTypes.find((gt) => gt.id === state.editingGameId)
  const archiveConfirmGameType = state.gameTypes.find((gt) => gt.id === state.archiveConfirmGameTypeId)

  return (
    <>
      {showTitle && <h1>Game Types</h1>}

      <GameTypeForm state={state} dispatch={dispatch} onSubmit={handleAdd} />

      {state.error && <div className="error-msg">{state.error}</div>}

      {state.gameTypes.length === 0 ? (
        <div className="empty">No game types yet. Add one.</div>
      ) : (
        <ListContainer className="list-container--spaced">
          {state.gameTypes.map((gameType) => (
            <ListItemRow
              key={gameType.id}
              label={gameType.name}
              subtitle={winConditionLabel(gameType.winCondition)}
              onView={() => dispatch({ type: 'selectGame', id: gameType.id })}
              onEdit={() => handleEdit(gameType.id)}
              onDelete={() => dispatch({ type: 'showArchiveConfirm', gameTypeId: gameType.id })}
            />
          ))}
        </ListContainer>
      )}

      <LudoModal
        open={state.selectedGameId !== undefined && state.editingGameId === undefined && selectedGameType !== undefined}
        title={selectedGameType?.name ?? ''}
        onClose={() => dispatch({ type: 'deselectGame' })}
        footer={
          <>
            <LudoButton text="Back" variant="secondary" onClick={() => dispatch({ type: 'deselectGame' })} />
            <LudoButton
              text="Edit"
              variant="primary"
              onClick={() => selectedGameType && handleEdit(selectedGameType.id)}
            />
            <LudoButton
              text="Archive"
              variant="danger"
              onClick={() =>
                selectedGameType && dispatch({ type: 'showArchiveConfirm', gameTypeId: selectedGameType.id })
              }
            />
          </>
        }
      >
        {selectedGameType && (
          <>
            <div className="detail-row">
              <span className="detail-label">Win condition:</span>
              <span className="detail-value">{winConditionLabel(selectedGameType.winCondition)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Tie break:</span>
              <span className="detail-value">{tieBreakRuleLabel(selectedGameType.tieBreakRule)}</span>
            </div>
            {selectedGameType.tieBreakRule === 'SECONDARY_SCORE' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Tie break condition:</span>
                  <span className="detail-value">{winConditionLabel(selectedGameType.tieBreakCondition)}</span>
                </div>
                {selectedGameType.tieBreakLabel && (
                  <div className="detail-row">
                    <span className="detail-label">Tie break question:</span>
                    <span className="detail-value">{selectedGameType.tieBreakLabel}</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </LudoModal>

      <LudoModal
        open={state.editingGameId !== undefined && editingGameType !== undefined}
        title={editingGameType ? `Edit ${editingGameType.name}` : ''}
        onClose={() => dispatch({ type: 'cancelEdit' })}
        footer={
          <>
            <LudoButton text="Cancel" variant="secondary" onClick={() => dispatch({ type: 'cancelEdit' })} />
            <LudoButton text="Save changes" variant="primary" onClick={handleUpdate} />
          </>
        }
      >
        <GameTypeFields state={state} dispatch={dispatch} />
      </LudoModal>

      <LudoModal
        open={state.archiveConfirmGameTypeId !== undefined && archiveConfirmGameType !== undefined}
        title={archiveConfirmGameType ? `Archive ${archiveConfirmGameType.name}?` : ''}
        onClose={() => dispatch({ type: 'dismissArchiveConfirm' })}
        footer={
          <>
            <LudoButton text="Cancel" variant="secondary" onClick={() => dispatch({ type: 'dismissArchiveConfirm' })} />
            <LudoButton
              text="Archive"
              variant="danger"
              onClick={() => state.archiveConfirmGameTypeId !== undefined && handleArchive(state.archiveConfirmGameTypeId)}
            />
          </>
        }
      >
        It will no longer appear in game selection.
      </LudoModal>
    </>
  )
}
