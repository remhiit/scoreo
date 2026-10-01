import {
  AppHeader,
  EmptyState,
  ScreenTemplate,
  SideMenu,
  type SideMenuItem,
} from '@scoreboards/design-system'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddGameTypeUseCase } from './application/addGameTypeUseCase'
import { AddPlayerUseCase } from './application/addPlayerUseCase'
import { ArchiveGameTypeUseCase } from './application/archiveGameTypeUseCase'
import { CleanupInactivePlayersUseCase } from './application/cleanupInactivePlayersUseCase'
import { CreateMatchUseCase } from './application/createMatchUseCase'
import { DeleteMatchUseCase } from './application/deleteMatchUseCase'
import { DeletePlayerUseCase } from './application/deletePlayerUseCase'
import { FindGameTypeByIdUseCase } from './application/findGameTypeByIdUseCase'
import { GetGameTypesUseCase } from './application/getGameTypesUseCase'
import { GetHeadToHeadUseCase } from './application/getHeadToHeadUseCase'
import { GetMatchesUseCase } from './application/getMatchesUseCase'
import { GetPlayerStatsUseCase } from './application/getPlayerStatsUseCase'
import { GetPlayersUseCase } from './application/getPlayersUseCase'
import { GetTrophiesUseCase } from './application/getTrophiesUseCase'
import { ImportMatchesUseCase } from './application/importMatchesUseCase'
import { MergeGameTypesUseCase } from './application/mergeGameTypesUseCase'
import { MergePlayersUseCase } from './application/mergePlayersUseCase'
import { RenamePlayerUseCase } from './application/renamePlayerUseCase'
import { UpdateGameTypeUseCase } from './application/updateGameTypeUseCase'
import { UpdateMatchUseCase } from './application/updateMatchUseCase'
import type { WinCondition } from './domain/model/enums'
import type { Services } from './services/createServices'
import { ServicesProvider, useServices } from './services/ServicesContext'
import { GameTypeScreen } from './ui/gametype/GameTypeScreen'
import { HallOfFameScreen } from './ui/halloffame/HallOfFameScreen'
import { HistoryScreen } from './ui/history/HistoryScreen'
import { HomeScreen } from './ui/home/HomeScreen'
import { ImportScreen } from './ui/import/ImportScreen'
import {
  GAMES_SCREEN,
  HALL_OF_FAME_SCREEN,
  HISTORY_SCREEN,
  HOME_SCREEN,
  IMPORT_SCREEN,
  moduleScoreScreen,
  scoreDetailScreen,
  STATS_SCREEN,
  SYNC_SCREEN,
} from './ui/navigation/screen'
import type { Screen } from './ui/navigation/screen'
import { useHashRouter } from './ui/navigation/useHashRouter'
import { buildInitialState } from './ui/scoredetail/scoreDetailReducer'
import { ScoreDetailScreen } from './ui/scoredetail/ScoreDetailScreen'
import type { ScoreDetailMode } from './ui/scoredetail/scoreDetailTypes'
import { LanguagePickerDialog } from './ui/shared/LanguagePickerDialog'
import { StatsScreen } from './ui/stats/StatsScreen'
import { SyncScreen } from './ui/sync/SyncScreen'
import { useAutoSync } from './ui/sync/useAutoSync'
import { ThemeProvider } from './ui/theme/ThemeContext'
import { ThemePickerDialog } from './ui/theme/ThemePickerDialog'
import { BindModuleUseCase } from './application/bindModuleUseCase'
import { ModuleScoreScreen } from './modules/ModuleScoreScreen'
import { findManifest, MODULE_MANIFESTS } from './modules/registry'

function screenTitle(screen: Screen): string {
  switch (screen.type) {
    case 'Home':
      return 'Scoreo'
    case 'History':
      return 'History'
    case 'Import':
      return 'Import'
    case 'Stats':
      return 'Stats'
    case 'Games':
      return 'Games'
    case 'Sync':
      return 'Sync'
    case 'HallOfFame':
      return 'Hall of Fame'
    case 'ScoreDetail':
      return screen.matchId !== undefined ? 'Edit match' : 'Score Detail'
    case 'ModuleScore':
      return screen.matchId !== undefined ? 'Edit match' : 'Score Detail'
  }
}

interface ScoreDetailRouteProps {
  screen: Extract<Screen, { type: 'ScoreDetail' }>
  services: Services
  onSaved: () => void
  onCancel: () => void
  onMissingGameType: () => void
}

/**
 * Resolves the gameType/players/mode for the ScoreDetail route and builds the
 * screen's initial state, mirroring App.kt's `remember(screen) { ... }` +
 * `ScoreDetailHandler(...)` construction — deliberately ad hoc per-screen
 * wiring, not part of ServicesContext (per TS-056).
 */
function ScoreDetailRoute({
  screen,
  services,
  onSaved,
  onCancel,
  onMissingGameType,
}: ScoreDetailRouteProps) {
  const gameType = useMemo(
    () => services.gameTypeRepository.findById(screen.gameTypeId),
    [services, screen.gameTypeId],
  )
  const players = useMemo(
    () => services.playerRepository.getAll().filter((p) => screen.playerIds.includes(p.id)),
    [services, screen.playerIds],
  )
  const mode: ScoreDetailMode = useMemo(() => {
    if (screen.matchId === undefined) return { type: 'Create' }
    return {
      type: 'Edit',
      matchId: screen.matchId,
      updateMatchUseCase: new UpdateMatchUseCase(services.matchRepository),
      matchRepository: services.matchRepository,
      playerRepository: services.playerRepository,
      gameTypeRepository: services.gameTypeRepository,
    }
  }, [services, screen.matchId])
  const createMatch = useMemo(
    () => new CreateMatchUseCase(services.matchRepository, services.gameTypeRepository),
    [services],
  )
  const initialState = useMemo(() => {
    if (!gameType) return undefined
    return buildInitialState(
      gameType,
      players,
      mode,
      services.currentDate,
      services.matchDraftRepository,
    )
  }, [gameType, players, mode, services])

  useEffect(() => {
    if (!gameType) onMissingGameType()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType])

  if (!gameType || !initialState) return null

  return (
    <ScoreDetailScreen
      initialState={initialState}
      createMatch={createMatch}
      mode={mode}
      currentDate={services.currentDate}
      matchDraftRepository={services.matchDraftRepository}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  )
}

function AppShell() {
  const { t } = useTranslation()
  const services = useServices()
  useAutoSync(services.autoSyncCoordinator)
  const { current, navigate } = useHashRouter()
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false)
  const [statsBackOverride, setStatsBackOverride] = useState<(() => void) | null>(null)
  const [highlightMatchId, setHighlightMatchId] = useState<string | undefined>(undefined)
  const [prevScreenForStatsBack, setPrevScreenForStatsBack] = useState(current)
  if (prevScreenForStatsBack !== current) {
    setPrevScreenForStatsBack(current)
    setStatsBackOverride(null)
    // Leaving History for any reason other than a fresh module save (which
    // sets the highlight in the same batch as this navigation) drops it —
    // reaching History again later otherwise shows a stale row.
    if (prevScreenForStatsBack.type === 'History' && highlightMatchId !== undefined) {
      setHighlightMatchId(undefined)
    }
  }
  const getHeadToHead = useMemo(
    () =>
      new GetHeadToHeadUseCase(
        services.matchRepository,
        services.gameTypeRepository,
        services.playerRepository,
      ),
    [services],
  )
  const getGameTypes = useMemo(
    () => new GetGameTypesUseCase(services.gameTypeRepository),
    [services],
  )
  const getMatches = useMemo(() => new GetMatchesUseCase(services.matchRepository), [services])
  const getPlayers = useMemo(() => new GetPlayersUseCase(services.playerRepository), [services])
  const deleteMatchUseCase = useMemo(
    () => new DeleteMatchUseCase(services.matchRepository),
    [services],
  )
  const addGameType = useMemo(() => new AddGameTypeUseCase(services.gameTypeRepository), [services])
  const updateGameType = useMemo(
    () => new UpdateGameTypeUseCase(services.gameTypeRepository),
    [services],
  )
  const findGameTypeById = useMemo(
    () => new FindGameTypeByIdUseCase(services.gameTypeRepository),
    [services],
  )
  const archiveGameType = useMemo(
    () => new ArchiveGameTypeUseCase(services.gameTypeRepository),
    [services],
  )
  const mergeGameTypes = useMemo(
    () =>
      new MergeGameTypesUseCase(
        services.gameTypeRepository,
        services.matchRepository,
        services.matchDraftRepository,
      ),
    [services],
  )
  const importUseCase = useMemo(
    () =>
      new ImportMatchesUseCase(
        services.playerRepository,
        services.gameTypeRepository,
        services.matchRepository,
        services.currentDate,
        MODULE_MANIFESTS,
      ),
    [services],
  )
  const addPlayer = useMemo(() => new AddPlayerUseCase(services.playerRepository), [services])
  const getPlayerStats = useMemo(
    () => new GetPlayerStatsUseCase(services.matchRepository, services.gameTypeRepository),
    [services],
  )
  const getTrophies = useMemo(
    () =>
      new GetTrophiesUseCase(
        services.matchRepository,
        services.gameTypeRepository,
        services.playerRepository,
      ),
    [services],
  )
  const deletePlayer = useMemo(() => new DeletePlayerUseCase(services.playerRepository), [services])
  const renamePlayerUseCase = useMemo(
    () => new RenamePlayerUseCase(services.playerRepository),
    [services],
  )
  const mergePlayersUseCase = useMemo(
    () =>
      new MergePlayersUseCase(
        services.playerRepository,
        services.matchRepository,
        services.matchDraftRepository,
      ),
    [services],
  )
  const cleanupInactivePlayers = useMemo(
    () => new CleanupInactivePlayersUseCase(services.playerRepository, services.matchRepository),
    [services],
  )
  const handleImportDone = useCallback(() => {
    navigate(HOME_SCREEN)
  }, [navigate])
  const handleStatsBackOverrideChange = useCallback((override: (() => void) | null) => {
    setStatsBackOverride(() => override)
  }, [])
  const handleEditMatch = useCallback(
    (gameTypeId: string, playerIds: string[], matchId: string) => {
      // A match scored on a module reopens *there*, so its own grid comes back.
      // Scoreo's generic screen would only know the totals the module handed
      // over, and re-saving from it would drop the module's state.
      const moduleId = services.matchRepository.findById(matchId)?.moduleData?.moduleId
      // Falls through when the module has since been removed: the generic
      // screen still shows the match rather than a dead end.
      if (moduleId !== undefined && findManifest(moduleId) !== undefined) {
        navigate(moduleScoreScreen(moduleId, gameTypeId, playerIds, matchId))
        return
      }
      navigate(scoreDetailScreen(gameTypeId, playerIds, matchId))
    },
    [navigate, services],
  )
  const handleStartGame = useCallback(
    (gameTypeId: string, playerIds: string[]) => {
      navigate(scoreDetailScreen(gameTypeId, playerIds))
    },
    [navigate],
  )
  /**
   * Binding happens here, on the way in: no game type is created until someone
   * actually chooses to play a module's game — on the module or in Scoreo.
   */
  const bindModule = useCallback(
    (moduleId: string) => {
      const manifest = findManifest(moduleId)
      return manifest && new BindModuleUseCase(services.gameTypeRepository).invoke(manifest)
    },
    [services],
  )
  const handleStartModule = useCallback(
    (moduleId: string, playerIds: string[]) => {
      const gameType = bindModule(moduleId)
      if (gameType) navigate(moduleScoreScreen(moduleId, gameType.id, playerIds))
    },
    [navigate, bindModule],
  )
  const handleStartModuleInScoreo = useCallback(
    (moduleId: string, playerIds: string[]) => {
      const gameType = bindModule(moduleId)
      if (gameType) navigate(scoreDetailScreen(gameType.id, playerIds))
    },
    [navigate, bindModule],
  )
  const homeGetGameTypes = useCallback(
    (includeInactive?: boolean) => getGameTypes.invoke(includeInactive),
    [getGameTypes],
  )
  const homeOnAddGameType = useCallback(
    (name: string, winCondition: WinCondition) => addGameType.invoke(name, winCondition),
    [addGameType],
  )
  const homeGetMatchCount = useCallback(() => services.matchRepository.getAll().length, [services])

  const onBack: (() => void) | null = (() => {
    switch (current.type) {
      case 'Home':
        return null
      case 'Stats':
        return statsBackOverride ?? (() => navigate(HOME_SCREEN))
      case 'ScoreDetail':
        return () => navigate(current.matchId !== undefined ? HISTORY_SCREEN : HOME_SCREEN)
      default:
        return () => navigate(HOME_SCREEN)
    }
  })()

  if (current.type === 'ModuleScore') {
    return (
      <ModuleScoreScreen
        screen={current}
        services={services}
        onExit={(savedMatchId) => {
          if (savedMatchId !== undefined) {
            setHighlightMatchId(savedMatchId)
            navigate(HISTORY_SCREEN)
            return
          }
          navigate(current.matchId !== undefined ? HISTORY_SCREEN : HOME_SCREEN)
        }}
      />
    )
  }

  const goTo = (target: Screen) => () => {
    setBurgerOpen(false)
    navigate(target)
  }
  const menuItems: SideMenuItem[] = [
    { icon: 'home', label: t('menu.home'), onClick: goTo(HOME_SCREEN) },
    { icon: 'stats', label: t('menu.stats'), onClick: goTo(STATS_SCREEN) },
    { icon: 'trophy', label: t('menu.hallOfFame'), onClick: goTo(HALL_OF_FAME_SCREEN) },
    { icon: 'history', label: t('menu.history'), onClick: goTo(HISTORY_SCREEN) },
    { icon: 'upload', label: t('menu.import'), onClick: goTo(IMPORT_SCREEN) },
    { icon: 'games', label: t('menu.games'), onClick: goTo(GAMES_SCREEN) },
    ...(services.syncUseCase
      ? [
          {
            icon: 'cloud',
            label: t('menu.sync'),
            onClick: goTo(SYNC_SCREEN),
          } satisfies SideMenuItem,
        ]
      : []),
    {
      icon: 'palette',
      label: t('menu.theme'),
      onClick: () => {
        setBurgerOpen(false)
        setThemePickerOpen(true)
      },
    },
    {
      icon: 'language',
      label: t('menu.language'),
      onClick: () => {
        setBurgerOpen(false)
        setLanguagePickerOpen(true)
      },
    },
  ]

  return (
    <ScreenTemplate
      header={
        <AppHeader
          title={screenTitle(current)}
          back={onBack ? { label: 'Back', onClick: onBack } : undefined}
          menu={{ label: 'Menu', onClick: () => setBurgerOpen(true) }}
          onTitleClick={current.type !== 'Home' ? () => navigate(HOME_SCREEN) : undefined}
        />
      }
      overlays={
        <>
          <SideMenu
            open={burgerOpen}
            onClose={() => setBurgerOpen(false)}
            closeLabel={t('common.close')}
            items={menuItems}
          />
          {themePickerOpen && <ThemePickerDialog onClose={() => setThemePickerOpen(false)} />}
          {languagePickerOpen && (
            <LanguagePickerDialog onClose={() => setLanguagePickerOpen(false)} />
          )}
        </>
      }
    >
      {current.type === 'Home' && (
        <HomeScreen
          addPlayer={addPlayer}
          getPlayers={getPlayers}
          getPlayerStats={getPlayerStats}
          deletePlayer={deletePlayer}
          renamePlayerUseCase={renamePlayerUseCase}
          mergePlayersUseCase={mergePlayersUseCase}
          cleanupInactivePlayers={cleanupInactivePlayers}
          getTrophies={getTrophies}
          getGameTypes={homeGetGameTypes}
          onAddGameType={homeOnAddGameType}
          onStartGame={handleStartGame}
          onStartModule={handleStartModule}
          onStartModuleInScoreo={handleStartModuleInScoreo}
          matchDraftRepository={services.matchDraftRepository}
          onResumeDraft={handleStartGame}
          getMatchCount={homeGetMatchCount}
        />
      )}
      {current.type === 'History' && (
        <HistoryScreen
          getMatches={getMatches}
          getPlayers={getPlayers}
          getGameTypes={getGameTypes}
          deleteMatchUseCase={deleteMatchUseCase}
          onEditMatch={handleEditMatch}
          highlightMatchId={highlightMatchId}
        />
      )}
      {current.type === 'Stats' && (
        <StatsScreen
          getHeadToHead={getHeadToHead}
          getGameTypes={getGameTypes}
          getTrophies={getTrophies}
          onBackOverrideChange={handleStatsBackOverrideChange}
        />
      )}
      {current.type === 'Import' && (
        <ImportScreen importUseCase={importUseCase} onDone={handleImportDone} />
      )}
      {current.type === 'HallOfFame' && (
        <HallOfFameScreen getTrophies={getTrophies} getGameTypes={getGameTypes} />
      )}
      {current.type === 'Games' && (
        <GameTypeScreen
          addGameType={addGameType}
          updateGameType={updateGameType}
          getGameTypes={getGameTypes}
          findGameTypeById={findGameTypeById}
          archiveGameType={archiveGameType}
          mergeGameTypes={mergeGameTypes}
        />
      )}
      {current.type === 'Sync' &&
        (services.syncUseCase ? (
          <SyncScreen syncUseCase={services.syncUseCase} />
        ) : (
          <EmptyState icon="cloud" title="Sync not available" />
        ))}
      {current.type === 'ScoreDetail' && (
        <ScoreDetailRoute
          screen={current}
          services={services}
          onSaved={() => navigate(current.matchId !== undefined ? HISTORY_SCREEN : HOME_SCREEN)}
          onCancel={() => navigate(current.matchId !== undefined ? HISTORY_SCREEN : HOME_SCREEN)}
          onMissingGameType={() => navigate(HOME_SCREEN)}
        />
      )}
    </ScreenTemplate>
  )
}

export function App() {
  return (
    <ServicesProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </ServicesProvider>
  )
}
