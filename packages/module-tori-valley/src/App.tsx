import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { AddPlayerUseCase } from './application/addPlayerUseCase'
import { CreateMatchUseCase } from './application/createMatchUseCase'
import { DeleteMatchUseCase } from './application/deleteMatchUseCase'
import { DeletePlayerUseCase } from './application/deletePlayerUseCase'
import { GetMatchesUseCase } from './application/getMatchesUseCase'
import { GetPlayersUseCase } from './application/getPlayersUseCase'
import { UpdateMatchUseCase } from './application/updateMatchUseCase'
import { ServicesProvider, useServices } from './services/ServicesContext'
import { HistoryScreen } from './ui/history/HistoryScreen'
import { HomeScreen } from './ui/home/HomeScreen'
import { HISTORY_SCREEN, HOME_SCREEN, scoreDetailScreen } from './ui/navigation/screen'
import type { Screen } from './ui/navigation/screen'
import { useHashRouter } from './ui/navigation/useHashRouter'
import { buildInitialState } from './ui/scoredetail/scoreDetailReducer'
import { ScoreDetailScreen } from './ui/scoredetail/ScoreDetailScreen'
import type { ScoreDetailMode } from './ui/scoredetail/scoreDetailTypes'
import { AppButton } from './ui/shared/AppButton'

function screenTitle(screen: Screen): string {
  switch (screen.type) {
    case 'Home':
      return 'Torī Valley'
    case 'History':
      return 'History'
    case 'ScoreDetail':
      return screen.matchId !== undefined ? 'Edit match' : 'New match'
  }
}

interface ScoreDetailRouteProps {
  screen: Extract<Screen, { type: 'ScoreDetail' }>
  onSaved: () => void
  onCancel: () => void
}

function ScoreDetailRoute({ screen, onSaved, onCancel }: ScoreDetailRouteProps) {
  const services = useServices()
  const players = useMemo(
    () => services.playerRepository.getAll(true).filter((p) => screen.playerIds.includes(p.id)),
    [services, screen.playerIds],
  )
  const existingMatch = useMemo(
    () =>
      screen.matchId !== undefined ? services.matchRepository.findById(screen.matchId) : undefined,
    [services, screen.matchId],
  )
  const mode: ScoreDetailMode = useMemo(
    () =>
      screen.matchId !== undefined ? { type: 'Edit', matchId: screen.matchId } : { type: 'Create' },
    [screen.matchId],
  )
  const createMatch = useMemo(() => new CreateMatchUseCase(services.matchRepository), [services])
  const updateMatch = useMemo(() => new UpdateMatchUseCase(services.matchRepository), [services])
  const initialState = useMemo(
    () => buildInitialState(players, mode, existingMatch?.results ?? []),
    [players, mode, existingMatch],
  )

  if (players.length === 0) return null

  return (
    <ScoreDetailScreen
      initialState={initialState}
      createMatch={createMatch}
      updateMatch={updateMatch}
      currentDate={services.currentDate}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  )
}

function AppShell() {
  const services = useServices()
  const { current, navigate } = useHashRouter()

  const addPlayer = useMemo(() => new AddPlayerUseCase(services.playerRepository), [services])
  const getPlayers = useMemo(() => new GetPlayersUseCase(services.playerRepository), [services])
  const deletePlayer = useMemo(() => new DeletePlayerUseCase(services.playerRepository), [services])
  const getMatches = useMemo(() => new GetMatchesUseCase(services.matchRepository), [services])
  const deleteMatch = useMemo(() => new DeleteMatchUseCase(services.matchRepository), [services])

  const onBack: (() => void) | null = current.type === 'Home' ? null : () => navigate(HOME_SCREEN)

  return (
    <>
      <div className="app-header">
        {onBack && (
          <AppButton
            text={<ArrowLeft size={20} />}
            variant="ghost"
            iconOnly
            ariaLabel="Back"
            onClick={onBack}
          />
        )}
        <span
          className="app-title clickable"
          onClick={() => current.type !== 'Home' && navigate(HOME_SCREEN)}
        >
          {screenTitle(current)}
        </span>
      </div>

      <div className="app-content">
        {current.type === 'Home' && (
          <HomeScreen
            addPlayer={addPlayer}
            getPlayers={getPlayers}
            deletePlayer={deletePlayer}
            onStartMatch={(playerIds) => navigate(scoreDetailScreen(playerIds))}
            onViewHistory={() => navigate(HISTORY_SCREEN)}
          />
        )}
        {current.type === 'History' && (
          <HistoryScreen
            getMatches={getMatches}
            getPlayers={getPlayers}
            deleteMatch={deleteMatch}
            onEditMatch={(matchId, playerIds) => navigate(scoreDetailScreen(playerIds, matchId))}
          />
        )}
        {current.type === 'ScoreDetail' && (
          <ScoreDetailRoute
            screen={current}
            onSaved={() => navigate(current.matchId !== undefined ? HISTORY_SCREEN : HOME_SCREEN)}
            onCancel={() => navigate(current.matchId !== undefined ? HISTORY_SCREEN : HOME_SCREEN)}
          />
        )}
      </div>
    </>
  )
}

export function App() {
  return (
    <ServicesProvider>
      <AppShell />
    </ServicesProvider>
  )
}
