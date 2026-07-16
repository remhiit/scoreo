import { Play, Sparkles } from 'lucide-react'
import { useReducer, useState } from 'react'
import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { NotFoundError, ValidationError } from '../../domain/model/errors'
import type { WinCondition } from '../../domain/model/enums'
import { winConditionLabel } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'
import { ListContainer } from '../shared/ListContainer'
import { ListItemRow } from '../shared/ListItemRow'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { LudoTextInput } from '../shared/LudoTextInput'
import {
  loadPlayers,
  playerReducer,
  submitAddPlayer,
  submitCleanup,
  submitConfirmRename,
  submitDeletePlayer,
} from './playerReducer'
import { initialPlayerState } from './playerTypes'

export interface HomeScreenProps {
  addPlayer: AddPlayerUseCase
  getPlayers: GetPlayersUseCase
  getPlayerStats: GetPlayerStatsUseCase
  deletePlayer: DeletePlayerUseCase
  renamePlayerUseCase: RenamePlayerUseCase
  cleanupInactivePlayers: CleanupInactivePlayersUseCase
  getGameTypes: () => GameType[]
  onAddGameType: (name: string, winCondition: WinCondition) => GameType
  onStartGame: (gameTypeId: string, playerIds: string[]) => void
  matchDraftRepository?: MatchDraftRepository
  onResumeDraft?: (gameTypeId: string, playerIds: string[]) => void
  getMatchCount?: () => number
}

function domainErrorMessage(e: unknown): string {
  if (e instanceof ValidationError || e instanceof NotFoundError) return e.message
  return `Failed to create game type: ${e instanceof Error ? e.message : ''}`
}

export function HomeScreen({
  addPlayer,
  getPlayers,
  getPlayerStats,
  deletePlayer,
  renamePlayerUseCase,
  cleanupInactivePlayers,
  getGameTypes,
  onAddGameType,
  onStartGame,
  matchDraftRepository,
  onResumeDraft = () => {},
  getMatchCount = () => 0,
}: HomeScreenProps) {
  const [state, dispatch] = useReducer(
    playerReducer,
    initialPlayerState,
    (init) => ({ ...init, ...loadPlayers(getPlayers, getPlayerStats, cleanupInactivePlayers) }),
  )

  const draft = matchDraftRepository?.load()
  const matchCount = getMatchCount()

  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [anonymize, setAnonymize] = useState(false)

  const [showGameModal, setShowGameModal] = useState(false)
  const [modalGameTypes, setModalGameTypes] = useState<GameType[]>(() => getGameTypes())
  const [selectedGameType, setSelectedGameType] = useState<GameType | undefined>(undefined)
  const [gameModalError, setGameModalError] = useState<string | undefined>(undefined)

  const [showAddGameForm, setShowAddGameForm] = useState(false)
  const [inlineGameName, setInlineGameName] = useState('')
  const [inlineGameWinCondition, setInlineGameWinCondition] = useState<WinCondition>('HIGHEST_SCORE')
  const [inlineGameError, setInlineGameError] = useState<string | undefined>(undefined)

  const [prevDeleteConfirmPlayerId, setPrevDeleteConfirmPlayerId] = useState(state.deleteConfirmPlayerId)
  if (prevDeleteConfirmPlayerId !== state.deleteConfirmPlayerId) {
    setPrevDeleteConfirmPlayerId(state.deleteConfirmPlayerId)
    setAnonymize(false)
  }

  function toggleSelectPlayer(playerId: string) {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function addInlineGameType() {
    const name = inlineGameName.trim()
    try {
      const created = onAddGameType(name, inlineGameWinCondition)
      const refreshed = getGameTypes()
      setModalGameTypes(refreshed)
      setSelectedGameType(refreshed.find((gt) => gt.id === created.id))
      setShowAddGameForm(false)
      setInlineGameName('')
      setInlineGameWinCondition('HIGHEST_SCORE')
      setInlineGameError(undefined)
    } catch (e) {
      setInlineGameError(domainErrorMessage(e))
    }
  }

  const isFirstLaunch = state.players.length === 0 && matchCount === 0
  const playerToDelete = state.deleteConfirmPlayerId
    ? state.players.find((p) => p.id === state.deleteConfirmPlayerId)
    : undefined
  const playerToRename = state.renamingPlayerId
    ? state.players.find((p) => p.id === state.renamingPlayerId)
    : undefined

  return (
    <>
      {draft && (
        <div className="draft-resume-banner">
          <button
            type="button"
            className="draft-resume-button"
            onClick={() => onResumeDraft(draft.gameTypeId, draft.playerIds)}
          >
            <span>
              <Play size={16} aria-hidden />
            </span>
            <span>Resume match in progress</span>
          </button>
        </div>
      )}

      <div className="form-row">
        <LudoTextInput
          value={state.inputName}
          onChange={(name) => dispatch({ type: 'updateInput', name })}
          placeholder="Player name"
          invalid={state.error !== undefined}
          onEnter={() =>
            dispatch(submitAddPlayer(addPlayer, getPlayers, getPlayerStats, cleanupInactivePlayers, state))
          }
        />
        <LudoButton
          text="Add"
          variant="primary"
          onClick={() =>
            dispatch(submitAddPlayer(addPlayer, getPlayers, getPlayerStats, cleanupInactivePlayers, state))
          }
        />
      </div>

      {state.error && <div className="error-msg">{state.error}</div>}

      {isFirstLaunch && (
        <div className="onboarding-guide">
          <h3>Getting started</h3>
          <ol>
            <li>Add players above</li>
            <li>Create a game type (from the menu)</li>
            <li>Select ≥2 players and click &quot;Start match&quot;</li>
          </ol>
        </div>
      )}

      {state.players.length === 0 ? (
        <div className="empty">No players yet. Add one above.</div>
      ) : (
        <ListContainer>
          {state.players.map((player) => {
            const isSelected = selectedPlayers.has(player.id)
            const stats = state.stats.get(player.id)
            const subtitle = stats ? `${stats.wins}W ${stats.losses}L` : undefined
            return (
              <ListItemRow
                key={player.id}
                label={player.name}
                subtitle={subtitle}
                isSelectable
                isSelected={isSelected}
                onSelect={() => toggleSelectPlayer(player.id)}
                onEdit={() => dispatch({ type: 'startRename', playerId: player.id })}
                onDelete={() => {
                  dispatch({ type: 'showDeleteConfirm', id: player.id })
                  setAnonymize(false)
                }}
              />
            )
          })}
        </ListContainer>
      )}

      {state.players.length > 0 && selectedPlayers.size < 2 && (
        <div className="selection-hint">{selectedPlayers.size}/2 players selected</div>
      )}

      {state.cleanupCandidates.length > 0 && (
        <LudoButton
          text={
            <>
              <Sparkles size={16} aria-hidden /> Clean up ({state.cleanupCandidates.length})
            </>
          }
          variant="secondary"
          onClick={() => dispatch({ type: 'showCleanupConfirm' })}
        />
      )}

      {state.players.length > 0 && (
        <LudoButton
          text={
            <>
              <Play size={18} aria-hidden /> New Match
            </>
          }
          variant="primary"
          size="lg"
          disabled={selectedPlayers.size < 2}
          className="fab-position"
          onClick={() => {
            setModalGameTypes(getGameTypes())
            setSelectedGameType(undefined)
            setGameModalError(undefined)
            setShowAddGameForm(false)
            setShowGameModal(true)
          }}
        />
      )}

      <LudoModal
        open={showGameModal}
        title="Select a game"
        onClose={() => setShowGameModal(false)}
        footer={
          <>
            <LudoButton text="Cancel" variant="secondary" onClick={() => setShowGameModal(false)} />
            <LudoButton
              text="Start match"
              variant="primary"
              onClick={() => {
                if (!selectedGameType) {
                  setGameModalError('Please select a game')
                  return
                }
                setShowGameModal(false)
                onStartGame(selectedGameType.id, [...selectedPlayers])
              }}
            />
          </>
        }
      >
        {modalGameTypes.length === 0 ? (
          <div className="empty-inline">No game types yet. Add one.</div>
        ) : (
          <select
            className="select"
            value={selectedGameType?.id ?? ''}
            onChange={(e) => {
              const gt = modalGameTypes.find((g) => g.id === e.target.value)
              if (gt) {
                setSelectedGameType(gt)
                setGameModalError(undefined)
              }
            }}
          >
            <option value="">— Select a game —</option>
            {modalGameTypes.map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </select>
        )}

        <div className="modal-row">
          <LudoButton
            text={showAddGameForm ? '−' : '＋'}
            variant="secondary"
            iconOnly
            onClick={() => setShowAddGameForm(!showAddGameForm)}
          />
          <span>Add new game</span>
        </div>

        {showAddGameForm && (
          <div className="inline-form">
            <LudoTextInput
              value={inlineGameName}
              onChange={(name) => {
                setInlineGameName(name)
                setInlineGameError(undefined)
              }}
              placeholder="Game name"
              invalid={inlineGameError !== undefined}
              onEnter={() => {
                if (inlineGameName.trim() !== '') addInlineGameType()
              }}
            />
            <select
              className="select"
              value={inlineGameWinCondition}
              onChange={(e) => setInlineGameWinCondition(e.target.value as WinCondition)}
            >
              {(['HIGHEST_SCORE', 'LOWEST_SCORE', 'MANUAL'] as WinCondition[]).map((wc) => (
                <option key={wc} value={wc}>
                  {winConditionLabel(wc)}
                </option>
              ))}
            </select>
            {inlineGameError && <div className="error-msg">{inlineGameError}</div>}
            <LudoButton
              text="Add game"
              variant="primary"
              className="ludo-btn--full"
              onClick={() => {
                if (inlineGameName.trim() !== '') addInlineGameType()
              }}
            />
          </div>
        )}

        {gameModalError && <div className="error-msg">{gameModalError}</div>}
      </LudoModal>

      <LudoModal
        open={state.deleteConfirmPlayerId !== undefined}
        title={`Delete ${playerToDelete?.name ?? '?'}?`}
        onClose={() => dispatch({ type: 'dismissDeleteConfirm' })}
        footer={
          <>
            <LudoButton text="Cancel" variant="secondary" onClick={() => dispatch({ type: 'dismissDeleteConfirm' })} />
            <LudoButton
              text="Delete"
              variant="danger"
              onClick={() => {
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
          </>
        }
      >
        <div className="modal-body">Matches will be preserved.</div>
        <div className="modal-row">
          <input type="checkbox" checked={anonymize} onChange={() => setAnonymize(!anonymize)} />
          <span>Erase name from history</span>
        </div>
      </LudoModal>

      <LudoModal
        open={state.renamingPlayerId !== undefined && playerToRename !== undefined}
        title={`Rename ${playerToRename?.name ?? ''}`}
        onClose={() => dispatch({ type: 'cancelRename' })}
        footer={
          <>
            <LudoButton text="Cancel" variant="secondary" onClick={() => dispatch({ type: 'cancelRename' })} />
            <LudoButton
              text="Confirm"
              variant="primary"
              onClick={() => {
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
          </>
        }
      >
        <LudoTextInput
          value={state.renameInput}
          onChange={(name) => dispatch({ type: 'updateRenameInput', name })}
          autofocus
          onEnter={() => {
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
        {state.error && <div className="error-msg">{state.error}</div>}
      </LudoModal>

      <LudoModal
        open={state.showCleanupConfirm}
        title={`Clean up ${state.cleanupCandidates.length} inactive player(s)?`}
        onClose={() => dispatch({ type: 'dismissCleanupConfirm' })}
        footer={
          <>
            <LudoButton
              text="Cancel"
              variant="secondary"
              onClick={() => dispatch({ type: 'dismissCleanupConfirm' })}
            />
            <LudoButton
              text="Delete permanently"
              variant="danger"
              onClick={() => dispatch(submitCleanup(cleanupInactivePlayers, getPlayers, getPlayerStats))}
            />
          </>
        }
      >
        <div className="modal-body">This permanently deletes players with no recorded match. This cannot be undone.</div>
        <ul>
          {state.cleanupCandidates.map((player) => (
            <li key={player.id}>{player.name || '(unnamed player)'}</li>
          ))}
        </ul>
      </LudoModal>
    </>
  )
}
