import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { TORI_VALLEY_NS } from '../../i18n'
import type { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import type { ExportMatchesUseCase } from '../../application/exportMatchesUseCase'
import type { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { matchWinners, scorePlayerResult, type Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { AppButton } from '../shared/AppButton'
import { downloadJson } from '../shared/downloadJson'

export interface HistoryScreenProps {
  getMatches: GetMatchesUseCase
  getPlayers: GetPlayersUseCase
  deleteMatch: DeleteMatchUseCase
  exportMatches: ExportMatchesUseCase
  onEditMatch: (matchId: string, playerIds: string[]) => void
}

function playerName(players: Player[], playerId: string, t: TFunction): string {
  return players.find((p) => p.id === playerId)?.name ?? t('history.unknownPlayer')
}

/** Local calendar day, so the filename matches the date on the user's own clock. */
function exportFilename(exportedAt: number): string {
  return `tori-valley-scoreo-${new Date(exportedAt).toLocaleDateString('sv-SE')}.json`
}

export function HistoryScreen({
  getMatches,
  getPlayers,
  deleteMatch,
  exportMatches,
  onEditMatch,
}: HistoryScreenProps) {
  const { t } = useTranslation(TORI_VALLEY_NS)
  // Both reads hit localStorage synchronously, so they belong in the initial
  // state rather than in a mount effect: the first paint already has the data
  // instead of rendering an empty list and immediately re-rendering.
  const [matches, setMatches] = useState<Match[]>(() => getMatches.invoke())
  const [players] = useState<Player[]>(() => getPlayers.invoke(true))
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  function handleDelete(matchId: string) {
    deleteMatch.invoke(matchId)
    setMatches(getMatches.invoke())
    setExportNotice(null)
  }

  function handleExport() {
    const { payload, skippedSoloMatches } = exportMatches.invoke()
    // Scoreo's contract requires a non-empty `games`, so a history of nothing
    // but solo matches has no file to offer — say so instead of downloading one
    // that would be rejected at import.
    if (payload.games.length === 0) {
      setExportNotice(t('history.exportNothing'))
      return
    }
    downloadJson(exportFilename(payload.exportedAt), payload)
    setExportNotice(
      skippedSoloMatches > 0
        ? t('history.exportSkippedSolo', { count: skippedSoloMatches })
        : null,
    )
  }

  if (matches.length === 0) {
    return <p className="empty">{t('history.noMatches')}</p>
  }

  const sorted = [...matches].sort((a, b) => b.playedAt - a.playedAt)

  return (
    <div className="list">
      <div className="list-item">
        <AppButton
          text={
            <>
              <Download size={16} aria-hidden /> {t('history.exportForScoreo')}
            </>
          }
          variant="secondary"
          onClick={handleExport}
        />
      </div>
      {exportNotice && (
        <div className="card" role="status">
          {exportNotice}
        </div>
      )}
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
