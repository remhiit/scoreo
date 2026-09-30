import {
  Button,
  ButtonRow,
  DetailList,
  DetailRow,
  Dialog,
  EmptyState,
  List,
  ListRow,
  Stack,
  Text,
} from '@scoreboards/design-system'
import { useEffect, useMemo, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { AddGameTypeUseCase } from '../../application/addGameTypeUseCase'
import type { ArchiveGameTypeUseCase } from '../../application/archiveGameTypeUseCase'
import type { FindGameTypeByIdUseCase } from '../../application/findGameTypeByIdUseCase'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { MergeGameTypesUseCase } from '../../application/mergeGameTypesUseCase'
import type { UpdateGameTypeUseCase } from '../../application/updateGameTypeUseCase'
import { tieBreakRuleLabel, winConditionLabel } from '../../domain/model/enums'
import { GameTypeFields, GameTypeForm } from './GameTypeForm'
import {
  gameTypeReducer,
  loadGameTypes,
  resolveGameTypeForEdit,
  submitAddGameType,
  submitArchiveGameType,
  submitMergeGameTypes,
  submitUpdateGameType,
} from './gameTypeReducer'
import { initialGameTypeState } from './gameTypeTypes'
import { MergeGameTypesModal } from './MergeGameTypesModal'

export interface GameTypeScreenProps {
  addGameType: AddGameTypeUseCase
  updateGameType: UpdateGameTypeUseCase
  getGameTypes: GetGameTypesUseCase
  findGameTypeById: FindGameTypeByIdUseCase
  archiveGameType: ArchiveGameTypeUseCase
  mergeGameTypes: MergeGameTypesUseCase
  showTitle?: boolean
}

export function GameTypeScreen({
  addGameType,
  updateGameType,
  getGameTypes,
  findGameTypeById,
  archiveGameType,
  mergeGameTypes,
  showTitle = true,
}: GameTypeScreenProps) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(gameTypeReducer, initialGameTypeState)

  useEffect(() => {
    dispatch({ type: 'loaded', ...loadGameTypes(getGameTypes) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    const result = submitAddGameType(addGameType, getGameTypes, state)
    dispatch(
      'error' in result
        ? { type: 'addFailed', error: result.error }
        : { type: 'addSucceeded', ...result },
    )
  }

  const handleEdit = (id: string) => {
    const gameType = resolveGameTypeForEdit(findGameTypeById, id)
    if (gameType) dispatch({ type: 'editGameType', gameType })
  }

  const handleUpdate = () => {
    const editing = state.gameTypes.find((gt) => gt.id === state.editingGameId)
    if (!editing) return
    // Every field the form owns is overridden here; `moduleId` is deliberately
    // not one of them. It comes from `...editing` and must survive editing:
    // a game bound to a scoring module stays bound when it is renamed.
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
        : { type: 'updateSucceeded', ...result },
    )
  }

  const handleArchive = (gameTypeId: string) => {
    const result = submitArchiveGameType(archiveGameType, getGameTypes, gameTypeId)
    dispatch(
      'error' in result
        ? { type: 'archiveFailed', error: result.error }
        : { type: 'archiveSucceeded', ...result },
    )
  }

  const handleMerge = () => {
    const result = submitMergeGameTypes(mergeGameTypes, getGameTypes, state)
    if (!result) return
    dispatch(
      'error' in result
        ? { type: 'mergeFailed', error: result.error }
        : { type: 'mergeSucceeded', ...result },
    )
  }

  // Read-only projection of the pending merge, recomputed whenever either side
  // changes — the mutation itself stays in submitMergeGameTypes.
  const mergePreview = useMemo(() => {
    if (state.mergeKeptId === undefined || state.mergeDuplicateIds.length === 0) return undefined
    return mergeGameTypes.preview(state.mergeKeptId, state.mergeDuplicateIds)
  }, [mergeGameTypes, state.mergeKeptId, state.mergeDuplicateIds])

  const selectedGameType = state.gameTypes.find((gt) => gt.id === state.selectedGameId)
  const editingGameType = state.gameTypes.find((gt) => gt.id === state.editingGameId)
  const archiveConfirmGameType = state.gameTypes.find(
    (gt) => gt.id === state.archiveConfirmGameTypeId,
  )

  return (
    <Stack gap={4}>
      {showTitle && <Text variant="heading">{t('gametype.title')}</Text>}

      <GameTypeForm state={state} dispatch={dispatch} onSubmit={handleAdd} />

      {state.error && <Text variant="error">{state.error}</Text>}

      {state.gameTypes.length === 0 ? (
        <EmptyState>{t('gametype.noGameTypesYet')}</EmptyState>
      ) : (
        <List>
          {state.gameTypes.map((gameType) => (
            <ListRow
              key={gameType.id}
              title={gameType.name}
              subtitle={winConditionLabel(gameType.winCondition)}
              actions={[
                {
                  icon: 'view',
                  label: 'View details',
                  onClick: () => dispatch({ type: 'selectGame', id: gameType.id }),
                },
                { icon: 'edit', label: 'Edit', onClick: () => handleEdit(gameType.id) },
                {
                  icon: 'delete',
                  label: 'Delete',
                  tone: 'danger',
                  onClick: () => dispatch({ type: 'showArchiveConfirm', gameTypeId: gameType.id }),
                },
              ]}
            />
          ))}
        </List>
      )}

      {state.allGameTypes.length >= 2 && (
        <Stack direction="row" justify="center">
          <Button
            variant="secondary"
            icon="merge"
            onClick={() => dispatch({ type: 'showMergeDialog' })}
          >
            {t('gametype.merge')}
          </Button>
        </Stack>
      )}

      <Dialog
        open={
          state.selectedGameId !== undefined &&
          state.editingGameId === undefined &&
          selectedGameType !== undefined
        }
        title={selectedGameType?.name ?? ''}
        onClose={() => dispatch({ type: 'deselectGame' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow>
            <Button variant="secondary" onClick={() => dispatch({ type: 'deselectGame' })}>
              {t('gametype.back')}
            </Button>
            <Button onClick={() => selectedGameType && handleEdit(selectedGameType.id)}>
              {t('gametype.edit')}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedGameType &&
                dispatch({ type: 'showArchiveConfirm', gameTypeId: selectedGameType.id })
              }
            >
              {t('gametype.archive')}
            </Button>
          </ButtonRow>
        }
      >
        {selectedGameType && (
          <DetailList>
            <DetailRow
              label={t('gametype.winCondition')}
              value={winConditionLabel(selectedGameType.winCondition)}
            />
            <DetailRow
              label={t('gametype.tieBreak')}
              value={tieBreakRuleLabel(selectedGameType.tieBreakRule)}
            />
            {selectedGameType.tieBreakRule === 'SECONDARY_SCORE' && (
              <DetailRow
                label={t('gametype.tieBreakCondition')}
                value={winConditionLabel(selectedGameType.tieBreakCondition)}
              />
            )}
            {selectedGameType.tieBreakRule === 'SECONDARY_SCORE' &&
              selectedGameType.tieBreakLabel && (
                <DetailRow
                  label={t('gametype.tieBreakQuestion')}
                  value={selectedGameType.tieBreakLabel}
                />
              )}
          </DetailList>
        )}
      </Dialog>

      <Dialog
        open={state.editingGameId !== undefined && editingGameType !== undefined}
        title={editingGameType ? t('gametype.editTitle', { name: editingGameType.name }) : ''}
        onClose={() => dispatch({ type: 'cancelEdit' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow>
            <Button variant="secondary" onClick={() => dispatch({ type: 'cancelEdit' })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdate}>{t('gametype.saveChanges')}</Button>
          </ButtonRow>
        }
      >
        <GameTypeFields state={state} dispatch={dispatch} />
      </Dialog>

      <Dialog
        open={state.archiveConfirmGameTypeId !== undefined && archiveConfirmGameType !== undefined}
        title={
          archiveConfirmGameType
            ? t('gametype.archiveTitle', { name: archiveConfirmGameType.name })
            : ''
        }
        onClose={() => dispatch({ type: 'dismissArchiveConfirm' })}
        closeLabel={t('common.close')}
        actions={
          <ButtonRow>
            <Button variant="secondary" onClick={() => dispatch({ type: 'dismissArchiveConfirm' })}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                state.archiveConfirmGameTypeId !== undefined &&
                handleArchive(state.archiveConfirmGameTypeId)
              }
            >
              {t('gametype.archive')}
            </Button>
          </ButtonRow>
        }
      >
        <Text block>{t('gametype.archiveBody')}</Text>
      </Dialog>

      <MergeGameTypesModal
        open={state.showMergeDialog}
        gameTypes={state.allGameTypes}
        keptId={state.mergeKeptId}
        duplicateIds={state.mergeDuplicateIds}
        preview={mergePreview}
        error={state.mergeError}
        onSelectKept={(id) => dispatch({ type: 'selectMergeKept', id })}
        onToggleDuplicate={(id) => dispatch({ type: 'toggleMergeDuplicate', id })}
        onClose={() => dispatch({ type: 'dismissMergeDialog' })}
        onConfirmMerge={handleMerge}
      />
    </Stack>
  )
}
