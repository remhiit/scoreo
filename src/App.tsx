import { useCallback, useEffect, useMemo, useState } from 'react'
import { DeleteMatchUseCase } from './application/deleteMatchUseCase'
import { GetGameTypesUseCase } from './application/getGameTypesUseCase'
import { GetHeadToHeadUseCase } from './application/getHeadToHeadUseCase'
import { GetMatchesUseCase } from './application/getMatchesUseCase'
import { GetPlayersUseCase } from './application/getPlayersUseCase'
import { ServicesProvider, useServices } from './services/ServicesContext'
import { HistoryScreen } from './ui/history/HistoryScreen'
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
import { LudoButton } from './ui/shared/LudoButton'
import { StatsScreen } from './ui/stats/StatsScreen'
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
  icon: string
  label: string
  onClick: () => void
}

function BurgerItem({ icon, label, onClick }: BurgerItemProps) {
  return (
    <button type="button" className="burger-item" onClick={onClick}>
      <span className="burger-item-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function AppShell() {
  const services = useServices()
  const { current, navigate } = useHashRouter()
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [statsBackOverride, setStatsBackOverride] = useState<(() => void) | null>(null)
  const getHeadToHead = useMemo(
    () => new GetHeadToHeadUseCase(services.matchRepository, services.gameTypeRepository, services.playerRepository),
    [services],
  )
  const getGameTypes = useMemo(() => new GetGameTypesUseCase(services.gameTypeRepository), [services])
  const getMatches = useMemo(() => new GetMatchesUseCase(services.matchRepository), [services])
  const getPlayers = useMemo(() => new GetPlayersUseCase(services.playerRepository), [services])
  const deleteMatchUseCase = useMemo(() => new DeleteMatchUseCase(services.matchRepository), [services])
  const handleStatsBackOverrideChange = useCallback((override: (() => void) | null) => {
    setStatsBackOverride(() => override)
  }, [])
  const handleEditMatch = useCallback(
    (gameTypeId: string, playerIds: string[], matchId: string) => {
      navigate(scoreDetailScreen(gameTypeId, playerIds, matchId))
    },
    [navigate],
  )

  useEffect(() => {
    setStatsBackOverride(null)
  }, [current])

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
        {onBack && <LudoButton text="←" variant="ghost" iconOnly ariaLabel="Back" onClick={onBack} />}
        <span
          className="app-title clickable"
          onClick={() => {
            if (current.type !== 'Home') navigate(HOME_SCREEN)
          }}
        >
          {screenTitle(current)}
        </span>
        <LudoButton text="☰" variant="ghost" iconOnly ariaLabel="Menu" onClick={() => setBurgerOpen(true)} />
      </div>

      <div className="app-content">
        {current.type === 'Home' && <div>Home (placeholder)</div>}
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
        {current.type === 'Import' && <div>Import (placeholder)</div>}
        {current.type === 'Games' && <div>Games (placeholder)</div>}
        {current.type === 'Sync' &&
          (services.syncUseCase ? (
            <div>Sync (placeholder)</div>
          ) : (
            <div className="empty">☁ Sync not available</div>
          ))}
        {current.type === 'ScoreDetail' && <div>Score Detail (placeholder)</div>}
      </div>

      {burgerOpen && (
        <>
          <div className="burger-overlay" onClick={() => setBurgerOpen(false)} />
          <div className="burger-menu">
            <LudoButton
              text="✕"
              variant="ghost"
              iconOnly
              ariaLabel="Close"
              className="burger-close"
              onClick={() => setBurgerOpen(false)}
            />
            <BurgerItem
              icon="🏠"
              label="Home"
              onClick={() => {
                setBurgerOpen(false)
                navigate(HOME_SCREEN)
              }}
            />
            <BurgerItem
              icon="📊"
              label="Stats"
              onClick={() => {
                setBurgerOpen(false)
                navigate(STATS_SCREEN)
              }}
            />
            <BurgerItem
              icon="📋"
              label="History"
              onClick={() => {
                setBurgerOpen(false)
                navigate(HISTORY_SCREEN)
              }}
            />
            <BurgerItem
              icon="📥"
              label="Import"
              onClick={() => {
                setBurgerOpen(false)
                navigate(IMPORT_SCREEN)
              }}
            />
            <BurgerItem
              icon="🎮"
              label="Games"
              onClick={() => {
                setBurgerOpen(false)
                navigate(GAMES_SCREEN)
              }}
            />
            {services.syncUseCase && (
              <BurgerItem
                icon="☁"
                label="Sync"
                onClick={() => {
                  setBurgerOpen(false)
                  navigate(SYNC_SCREEN)
                }}
              />
            )}
            <BurgerItem
              icon="🎨"
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
