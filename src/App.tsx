import {
  ArrowLeft,
  BarChart3,
  Cloud,
  Gamepad2,
  History,
  Home,
  Menu,
  Palette,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { ImportMatchesUseCase } from './application/importMatchesUseCase'
import { RenamePlayerUseCase } from './application/renamePlayerUseCase'
import { UpdateGameTypeUseCase } from './application/updateGameTypeUseCase'
import { UpdateMatchUseCase } from './application/updateMatchUseCase'
import type { WinCondition } from './domain/model/enums'
import type { Services } from './services/createServices'
import { ServicesProvider, useServices } from './services/ServicesContext'
import { GameTypeScreen } from './ui/gametype/GameTypeScreen'
import { HistoryScreen } from './ui/history/HistoryScreen'
import { HomeScreen } from './ui/home/HomeScreen'
import { ImportScreen } from './ui/import/ImportScreen'
import {
  GAMES_SCREEN,
  HISTORY_SCREEN,
  HOME_SCREEN,
  IMPORT_SCREEN,
  scoreDetailScreen,
  STATS_SCREEN,
  SYNC_SCREEN,
} from './ui/navigation/screen'
import type { Screen } from './ui/navigation/screen'
import { useHashRouter } from './ui/navigation/useHashRouter'
import { buildInitialState } from './ui/scoredetail/scoreDetailReducer'
import { ScoreDetailScreen } from './ui/scoredetail/ScoreDetailScreen'
import type { ScoreDetailMode } from './ui/scoredetail/scoreDetailTypes'
import { LudoButton } from './ui/shared/LudoButton'
import { StatsScreen } from './ui/stats/StatsScreen'
import { SyncScreen } from './ui/sync/SyncScreen'
import { ThemeProvider } from './ui/theme/ThemeContext'
import { ThemePickerDialog } from './ui/theme/ThemePickerDialog'

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
    case 'ScoreDetail':
      return screen.matchId !== undefined ? 'Edit match' : 'Score Detail'
  }
}

interface BurgerItemProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

function BurgerItem({ icon: Icon, label, onClick }: BurgerItemProps) {
  return (
    <button type="button" className="burger-item" onClick={onClick}>
      <span className="burger-item-icon">
        <Icon size={20} aria-hidden />
      </span>
      <span>{label}</span>
    </button>
  )
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
function ScoreDetailRoute({ screen, services, onSaved, onCancel, onMissingGameType }: ScoreDetailRouteProps) {
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
    return buildInitialState(gameType, players, mode, services.matchDraftRepository)
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
  const services = useServices()
  const { current, navigate } = useHashRouter()
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [statsBackOverride, setStatsBackOverride] = useState<(() => void) | null>(null)
  const [prevScreenForStatsBack, setPrevScreenForStatsBack] = useState(current)
  if (prevScreenForStatsBack !== current) {
    setPrevScreenForStatsBack(current)
    setStatsBackOverride(null)
  }
  const getHeadToHead = useMemo(
    () => new GetHeadToHeadUseCase(services.matchRepository, services.gameTypeRepository, services.playerRepository),
    [services],
  )
  const getGameTypes = useMemo(() => new GetGameTypesUseCase(services.gameTypeRepository), [services])
  const getMatches = useMemo(() => new GetMatchesUseCase(services.matchRepository), [services])
  const getPlayers = useMemo(() => new GetPlayersUseCase(services.playerRepository), [services])
  const deleteMatchUseCase = useMemo(() => new DeleteMatchUseCase(services.matchRepository), [services])
  const addGameType = useMemo(() => new AddGameTypeUseCase(services.gameTypeRepository), [services])
  const updateGameType = useMemo(() => new UpdateGameTypeUseCase(services.gameTypeRepository), [services])
  const findGameTypeById = useMemo(() => new FindGameTypeByIdUseCase(services.gameTypeRepository), [services])
  const archiveGameType = useMemo(() => new ArchiveGameTypeUseCase(services.gameTypeRepository), [services])
  const importUseCase = useMemo(
    () =>
      new ImportMatchesUseCase(
        services.playerRepository,
        services.gameTypeRepository,
        services.matchRepository,
        services.currentDate,
      ),
    [services],
  )
  const addPlayer = useMemo(() => new AddPlayerUseCase(services.playerRepository), [services])
  const getPlayerStats = useMemo(
    () => new GetPlayerStatsUseCase(services.matchRepository, services.gameTypeRepository),
    [services],
  )
  const deletePlayer = useMemo(() => new DeletePlayerUseCase(services.playerRepository), [services])
  const renamePlayerUseCase = useMemo(() => new RenamePlayerUseCase(services.playerRepository), [services])
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
      navigate(scoreDetailScreen(gameTypeId, playerIds, matchId))
    },
    [navigate],
  )
  const handleStartGame = useCallback(
    (gameTypeId: string, playerIds: string[]) => {
      navigate(scoreDetailScreen(gameTypeId, playerIds))
    },
    [navigate],
  )
  const homeGetGameTypes = useCallback(() => getGameTypes.invoke(), [getGameTypes])
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

  return (
    <>
      <div className="app-header">
        {onBack && (
          <LudoButton text={<ArrowLeft size={20} />} variant="ghost" iconOnly ariaLabel="Back" onClick={onBack} />
        )}
        <span
          className="app-title clickable"
          onClick={() => {
            if (current.type !== 'Home') navigate(HOME_SCREEN)
          }}
        >
          {screenTitle(current)}
        </span>
        <LudoButton
          text={<Menu size={20} />}
          variant="ghost"
          iconOnly
          ariaLabel="Menu"
          onClick={() => setBurgerOpen(true)}
        />
      </div>

      <div className="app-content">
        {current.type === 'Home' && (
          <HomeScreen
            addPlayer={addPlayer}
            getPlayers={getPlayers}
            getPlayerStats={getPlayerStats}
            deletePlayer={deletePlayer}
            renamePlayerUseCase={renamePlayerUseCase}
            cleanupInactivePlayers={cleanupInactivePlayers}
            getGameTypes={homeGetGameTypes}
            onAddGameType={homeOnAddGameType}
            onStartGame={handleStartGame}
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
          />
        )}
        {current.type === 'Stats' && (
          <StatsScreen
            getHeadToHead={getHeadToHead}
            getGameTypes={getGameTypes}
            onBackOverrideChange={handleStatsBackOverrideChange}
          />
        )}
        {current.type === 'Import' && <ImportScreen importUseCase={importUseCase} onDone={handleImportDone} />}
        {current.type === 'Games' && (
          <GameTypeScreen
            addGameType={addGameType}
            updateGameType={updateGameType}
            getGameTypes={getGameTypes}
            findGameTypeById={findGameTypeById}
            archiveGameType={archiveGameType}
          />
        )}
        {current.type === 'Sync' &&
          (services.syncUseCase ? (
            <SyncScreen syncUseCase={services.syncUseCase} />
          ) : (
            <div className="empty">
            <Cloud size={20} aria-hidden /> Sync not available
          </div>
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
      </div>

      {burgerOpen && (
        <>
          <div className="burger-overlay" onClick={() => setBurgerOpen(false)} />
          <div className="burger-menu">
            <LudoButton
              text={<X size={20} />}
              variant="ghost"
              iconOnly
              ariaLabel="Close"
              className="burger-close"
              onClick={() => setBurgerOpen(false)}
            />
            <BurgerItem
              icon={Home}
              label="Home"
              onClick={() => {
                setBurgerOpen(false)
                navigate(HOME_SCREEN)
              }}
            />
            <BurgerItem
              icon={BarChart3}
              label="Stats"
              onClick={() => {
                setBurgerOpen(false)
                navigate(STATS_SCREEN)
              }}
            />
            <BurgerItem
              icon={History}
              label="History"
              onClick={() => {
                setBurgerOpen(false)
                navigate(HISTORY_SCREEN)
              }}
            />
            <BurgerItem
              icon={Upload}
              label="Import"
              onClick={() => {
                setBurgerOpen(false)
                navigate(IMPORT_SCREEN)
              }}
            />
            <BurgerItem
              icon={Gamepad2}
              label="Games"
              onClick={() => {
                setBurgerOpen(false)
                navigate(GAMES_SCREEN)
              }}
            />
            {services.syncUseCase && (
              <BurgerItem
                icon={Cloud}
                label="Sync"
                onClick={() => {
                  setBurgerOpen(false)
                  navigate(SYNC_SCREEN)
                }}
              />
            )}
            <BurgerItem
              icon={Palette}
              label="Theme"
              onClick={() => {
                setBurgerOpen(false)
                setThemePickerOpen(true)
              }}
            />
          </div>
        </>
      )}

      {themePickerOpen && <ThemePickerDialog onClose={() => setThemePickerOpen(false)} />}
    </>
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
