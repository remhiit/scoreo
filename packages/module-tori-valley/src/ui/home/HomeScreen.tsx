import { Trash2 } from 'lucide-react'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { AppButton } from '../shared/AppButton'
import { homeReducer, MAX_MATCH_PLAYERS, submitAddPlayer, submitDeletePlayer } from './homeReducer'
import { initialHomeState } from './homeTypes'

export interface HomeScreenProps {
  addPlayer: AddPlayerUseCase
  getPlayers: GetPlayersUseCase
  deletePlayer: DeletePlayerUseCase
  onStartMatch: (playerIds: string[]) => void
  onViewHistory: () => void
}

export function HomeScreen({
  addPlayer,
  getPlayers,
  deletePlayer,
  onStartMatch,
  onViewHistory,
}: HomeScreenProps) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(homeReducer, initialHomeState)

  useEffect(() => {
    dispatch({ type: 'loaded', players: getPlayers.invoke() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAddPlayer() {
    dispatch(submitAddPlayer(addPlayer, getPlayers, state, t))
  }

  function handleDeletePlayer(id: string) {
    dispatch(submitDeletePlayer(deletePlayer, getPlayers, id))
  }

  const canStartMatch =
    state.selectedPlayerIds.length >= 1 && state.selectedPlayerIds.length <= MAX_MATCH_PLAYERS

  return (
    <div>
      <div className="card">
        <h2>{t('home.playersHeading')}</h2>
        <div className="list-item">
          <input
            aria-label={t('home.newPlayerNameLabel')}
            value={state.inputName}
            onChange={(e) => dispatch({ type: 'updateInput', name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <AppButton text={t('home.add')} onClick={handleAddPlayer} />
        </div>
        {state.error && <p role="alert">{state.error}</p>}

        {state.players.length === 0 ? (
          <p className="empty">{t('home.noPlayers')}</p>
        ) : (
          <div className="list">
            {state.players.map((player) => (
              <label className="list-item" key={player.id}>
                <span>
                  <input
                    type="checkbox"
                    checked={state.selectedPlayerIds.includes(player.id)}
                    onChange={() => dispatch({ type: 'togglePlayerSelection', id: player.id })}
                  />{' '}
                  {player.name}
                </span>
                <AppButton
                  text={<Trash2 size={16} aria-hidden />}
                  variant="ghost"
                  iconOnly
                  ariaLabel={t('home.deletePlayerAria', { name: player.name })}
                  onClick={() => handleDeletePlayer(player.id)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="list-item">
        <AppButton text={t('home.viewHistory')} variant="secondary" onClick={onViewHistory} />
        <AppButton
          text={t('home.startMatch')}
          disabled={!canStartMatch}
          onClick={() => onStartMatch(state.selectedPlayerIds)}
        />
      </div>
    </div>
  )
}
