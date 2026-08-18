import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import type { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { matchWinners, scorePlayerResult, type Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { AppButton } from '../shared/AppButton'

export interface HistoryScreenProps {
  getMatches: GetMatchesUseCase
  getPlayers: GetPlayersUseCase
  deleteMatch: DeleteMatchUseCase
  onEditMatch: (matchId: string, playerIds: string[]) => void
}

function playerName(players: Player[], playerId: string, t: TFunction): string {
  return players.find((p) => p.id === playerId)?.name ?? t('history.unknownPlayer')
}

export function HistoryScreen({
  getMatches,
  getPlayers,
  deleteMatch,
  onEditMatch,
}: HistoryScreenProps) {
  const { t } = useTranslation()
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    setMatches(getMatches.invoke())
    setPlayers(getPlayers.invoke(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDelete(matchId: string) {
    deleteMatch.invoke(matchId)
    setMatches(getMatches.invoke())
  }

  if (matches.length === 0) {
    return <p className="empty">{t('history.noMatches')}</p>
  }

  const sorted = [...matches].sort((a, b) => b.playedAt - a.playedAt)

  return (
    <div className="list">
      {sorted.map((match) => {
        const winners = new Set(matchWinners(match))
        return (
          <div className="card" key={match.id}>
            <div className="list-item">
              <span>{new Date(match.playedAt).toLocaleDateString()}</span>
              <span>
                <AppButton
                  text={t('history.edit')}
                  variant="secondary"
                  onClick={() => onEditMatch(match.id, match.playerIds)}
                />
                <AppButton
                  text={<Trash2 size={16} aria-hidden />}
                  variant="ghost"
                  iconOnly
                  ariaLabel={t('history.deleteMatchAria')}
                  onClick={() => handleDelete(match.id)}
                />
              </span>
            </div>
            <table className="score-table">
              <tbody>
                {match.results.map((result) => (
                  <tr
                    key={result.playerId}
                    className={winners.has(result.playerId) ? 'total-row' : ''}
                  >
                    <th>
                      {playerName(players, result.playerId, t)}
                      {winners.has(result.playerId) ? ' 🏆' : ''}
                    </th>
                    <td>{t('history.vp', { value: scorePlayerResult(result) })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
