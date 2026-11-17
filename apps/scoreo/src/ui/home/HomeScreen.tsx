import { ActionBar, Banner, Button, Stack } from '@scoreboards/design-system'
import { useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import type { MergePlayersUseCase } from '../../application/mergePlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import type { WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'
import { AddPlayerField } from './AddPlayerField'
import { GameSelectModalContainer, type GameSelectModalHandle } from './GameSelectModalContainer'
import { PlayerActionModals } from './PlayerActionModals'
import { PlayerListSection } from './PlayerListSection'
import { loadPlayers, playerReducer, submitAddPlayer } from './playerReducer'
import { initialPlayerState } from './playerTypes'

export interface HomeScreenProps {
  addPlayer: AddPlayerUseCase
  getPlayers: GetPlayersUseCase
  getPlayerStats: GetPlayerStatsUseCase
  deletePlayer: DeletePlayerUseCase
  renamePlayerUseCase: RenamePlayerUseCase
  mergePlayersUseCase: MergePlayersUseCase
  cleanupInactivePlayers: CleanupInactivePlayersUseCase
  getTrophies: GetTrophiesUseCase
  getGameTypes: (includeInactive?: boolean) => GameType[]
  /** Matches of every game, for the game list to tell which homonym a module may bind. */
  getMatches?: () => Match[]
  onAddGameType: (name: string, winCondition: WinCondition) => GameType
  onStartGame: (gameTypeId: string, playerIds: string[]) => void
  onStartModule: (moduleId: string, playerIds: string[]) => void
  matchDraftRepository?: MatchDraftRepository
  /** `moduleId` is set when the draft is a game in progress on a scoring module. */
  onResumeDraft?: (gameTypeId: string, playerIds: string[], moduleId?: string) => void
  /** Whether a module is still installed; a draft of a removed module gets no banner. */
  isModuleAvailable?: (moduleId: string) => boolean
  getMatchCount?: () => number
}

export function HomeScreen({
  addPlayer,
  getPlayers,
  getPlayerStats,
  deletePlayer,
  renamePlayerUseCase,
  mergePlayersUseCase,
  cleanupInactivePlayers,
  getTrophies,
  getGameTypes,
  getMatches = () => [],
  onAddGameType,
  onStartGame,
  onStartModule,
  matchDraftRepository,
  onResumeDraft = () => {},
  isModuleAvailable = () => false,
  getMatchCount = () => 0,
}: HomeScreenProps) {
  const { t } = useTranslation()
  const sources = useMemo(
    () => ({ getPlayers, getPlayerStats, cleanupInactivePlayers, getTrophies }),
    [getPlayers, getPlayerStats, cleanupInactivePlayers, getTrophies],
  )
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState, (init) => ({
    ...init,
    ...loadPlayers(sources),
  }))

  const draft = matchDraftRepository?.load()
  const matchCount = getMatchCount()

  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())

  const gameModalRef = useRef<GameSelectModalHandle>(null)

  function toggleSelectPlayer(playerId: string) {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const isFirstLaunch = state.players.length === 0 && matchCount === 0

  return (
    <Stack gap={4}>
      {draft && (draft.moduleState === null || isModuleAvailable(draft.moduleState.moduleId)) && (
        <Banner
          action={{
            icon: 'play',
            label: t('home.resumeMatch'),
            onClick: () =>
              onResumeDraft(draft.gameTypeId, draft.playerIds, draft.moduleState?.moduleId),
          }}
        />
      )}

      <AddPlayerField
        value={state.inputName}
        onChange={(name) => dispatch({ type: 'updateInput', name })}
        onSubmit={() => dispatch(submitAddPlayer(addPlayer, sources, state))}
        error={state.error}
      />

      {isFirstLaunch && (
        <Banner
          title={t('home.gettingStarted')}
          steps={[t('home.onboardingStep1'), t('home.onboardingStep2'), t('home.onboardingStep3')]}
        />
      )}

      <PlayerListSection
        players={state.players}
        stats={state.stats}
        trophyCounts={state.trophyCounts}
        selectedPlayers={selectedPlayers}
        onToggleSelect={toggleSelectPlayer}
        onEditPlayer={(playerId) => dispatch({ type: 'startRename', playerId })}
        onDeleteRequest={(playerId) => dispatch({ type: 'showDeleteConfirm', id: playerId })}
        cleanupCandidatesCount={state.cleanupCandidates.length}
        onShowCleanupConfirm={() => dispatch({ type: 'showCleanupConfirm' })}
        mergeCandidatesCount={state.allPlayers.length}
        onShowMergeDialog={() => dispatch({ type: 'showMergeDialog' })}
      />

      {state.players.length > 0 && (
        <ActionBar layout="center">
          <Button
            size="lg"
            shape="pill"
            icon="play"
            disabled={selectedPlayers.size < 2}
            onClick={() => gameModalRef.current?.open()}
          >
            {t('home.newMatch')}
          </Button>
        </ActionBar>
      )}

      <GameSelectModalContainer
        ref={gameModalRef}
        getGameTypes={getGameTypes}
        getMatches={getMatches}
        onAddGameType={onAddGameType}
        onStartGame={onStartGame}
        onStartModule={onStartModule}
        selectedPlayerIds={[...selectedPlayers]}
      />

      <PlayerActionModals
        state={state}
        dispatch={dispatch}
        deletePlayer={deletePlayer}
        renamePlayerUseCase={renamePlayerUseCase}
        mergePlayersUseCase={mergePlayersUseCase}
        sources={sources}
      />
    </Stack>
  )
}
