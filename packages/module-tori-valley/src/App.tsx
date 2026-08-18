import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { AddPlayerUseCase } from './application/addPlayerUseCase'
import { CreateMatchUseCase } from './application/createMatchUseCase'
import { DeleteMatchUseCase } from './application/deleteMatchUseCase'
import { DeletePlayerUseCase } from './application/deletePlayerUseCase'
import { GetMatchesUseCase } from './application/getMatchesUseCase'
import { GetPlayersUseCase } from './application/getPlayersUseCase'
import { UpdateMatchUseCase } from './application/updateMatchUseCase'
import type { ObjectifCardSelection } from './domain/model/landscape'
import { SUPPORTED_LANGUAGES } from './i18n'
import { ServicesProvider, useServices } from './services/ServicesContext'
import { HistoryScreen } from './ui/history/HistoryScreen'
import { HomeScreen } from './ui/home/HomeScreen'
import { MatchSetupScreen } from './ui/matchsetup/MatchSetupScreen'
import {
  HISTORY_SCREEN,
  HOME_SCREEN,
  homeScreen,
  matchSetupScreen,
  scoreDetailScreen,
} from './ui/navigation/screen'
import type { Screen } from './ui/navigation/screen'
import { useHashRouter } from './ui/navigation/useHashRouter'
import { buildInitialState } from './ui/scoredetail/scoreDetailReducer'
import { ScoreDetailScreen } from './ui/scoredetail/ScoreDetailScreen'
import type { ScoreDetailMode } from './ui/scoredetail/scoreDetailTypes'
import { AppButton } from './ui/shared/AppButton'

function screenTitle(screen: Screen, t: TFunction): string {
  switch (screen.type) {
    case 'Home':
      return t('app.title')
    case 'History':
      return t('app.history')
    case 'MatchSetup':
      return t('app.matchSetup')
    case 'ScoreDetail':
      return screen.matchId !== undefined ? t('app.editMatch') : t('app.newMatch')
  }
}

interface MatchSetupRouteProps {
  screen: Extract<Screen, { type: 'MatchSetup' }>
  onConfirm: (objectifCards: ObjectifCardSelection) => void
  onCancel: () => void
}

/** Pre-fills the variants from the stored match when editing one. */
function MatchSetupRoute({ screen, onConfirm, onCancel }: MatchSetupRouteProps) {
  const services = useServices()
  const existingMatch = useMemo(
    () =>
      screen.matchId !== undefined ? services.matchRepository.findById(screen.matchId) : undefined,
    [services, screen.matchId],
  )

  return (
    <MatchSetupScreen
      playerIds={screen.playerIds}
      initialSelection={existingMatch?.objectifCards}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
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
  // Editing reads the cards off the stored match; creating gets them from the
  // setup screen via the route.
  const initialState = useMemo(
    () =>
      buildInitialState(
        players,
        mode,
        existingMatch?.results ?? [],
        screen.objectifCards ?? existingMatch?.objectifCards,
      ),
    [players, mode, existingMatch, screen.objectifCards],
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
  const { t, i18n } = useTranslation()

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
            ariaLabel={t('app.back')}
            onClick={onBack}
          />
        )}
        <span
          className="app-title clickable"
          onClick={() => current.type !== 'Home' && navigate(HOME_SCREEN)}
        >
          {screenTitle(current, t)}
        </span>
        <select
          className="lang-select"
          aria-label={t('language.label')}
          value={i18n.language}
          onChange={(e) => void i18n.changeLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <option key={lng} value={lng}>
              {lng === 'en' ? 'English' : 'Français'}
            </option>
          ))}
        </select>
      </div>

      <div className="app-content">
        {current.type === 'Home' && (
          <HomeScreen
            addPlayer={addPlayer}
            getPlayers={getPlayers}
            deletePlayer={deletePlayer}
            initialSelectedPlayerIds={current.selectedPlayerIds}
            onStartMatch={(playerIds) => navigate(matchSetupScreen(playerIds))}
            onViewHistory={() => navigate(HISTORY_SCREEN)}
          />
        )}
        {current.type === 'MatchSetup' && (
          <MatchSetupRoute
            screen={current}
            onConfirm={(objectifCards) =>
              navigate(scoreDetailScreen(current.playerIds, current.matchId, objectifCards))
            }
            onCancel={() =>
              navigate(
                current.matchId !== undefined ? HISTORY_SCREEN : homeScreen(current.playerIds),
              )
            }
          />
        )}
        {current.type === 'History' && (
          <HistoryScreen
            getMatches={getMatches}
            getPlayers={getPlayers}
            deleteMatch={deleteMatch}
            onEditMatch={(matchId, playerIds) => navigate(matchSetupScreen(playerIds, matchId))}
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
