import { Play } from 'lucide-react'
import { useReducer, useState } from 'react'
import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import type { WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'
import { LudoButton } from '../shared/LudoButton'
import { AddPlayerField } from './AddPlayerField'
import { CleanupConfirmModal } from './CleanupConfirmModal'
import { DeletePlayerModal } from './DeletePlayerModal'
import { GameSelectModal } from './GameSelectModal'
import { PlayerListSection } from './PlayerListSection'
import { RenamePlayerModal } from './RenamePlayerModal'
import { useGameSelectModal } from './useGameSelectModal'
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
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState, (init) => ({
    ...init,
    ...loadPlayers(getPlayers, getPlayerStats, cleanupInactivePlayers),
  }))

  const draft = matchDraftRepository?.load()
  const matchCount = getMatchCount()

  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [anonymize, setAnonymize] = useState(false)

  const gameModal = useGameSelectModal(getGameTypes, onAddGameType)

  const [prevDeleteConfirmPlayerId, setPrevDeleteConfirmPlayerId] = useState(
    state.deleteConfirmPlayerId,
  )
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

      <AddPlayerField
        value={state.inputName}
        onChange={(name) => dispatch({ type: 'updateInput', name })}
        onSubmit={() =>
          dispatch(
            submitAddPlayer(addPlayer, getPlayers, getPlayerStats, cleanupInactivePlayers, state),
          )
        }
        error={state.error}
      />

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

      <PlayerListSection
        players={state.players}
        stats={state.stats}
        selectedPlayers={selectedPlayers}
        onToggleSelect={toggleSelectPlayer}
        onEditPlayer={(playerId) => dispatch({ type: 'startRename', playerId })}
        onDeleteRequest={(playerId) => {
          dispatch({ type: 'showDeleteConfirm', id: playerId })
          setAnonymize(false)
        }}
        cleanupCandidatesCount={state.cleanupCandidates.length}
        onShowCleanupConfirm={() => dispatch({ type: 'showCleanupConfirm' })}
      />

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
          onClick={gameModal.openModal}
        />
      )}

      <GameSelectModal
        {...gameModal}
        onStartMatch={() =>
          gameModal.confirmStart((gameTypeId) => onStartGame(gameTypeId, [...selectedPlayers]))
        }
      />

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
