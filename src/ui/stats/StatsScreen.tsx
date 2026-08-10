import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameType } from '../../domain/model/gameType'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetHeadToHeadUseCase, PlayerDetail } from '../../application/getHeadToHeadUseCase'
import { loadStats, statsReducer } from './statsReducer'
import { initialStatsState, selectedPlayer } from './statsTypes'
import { ListContainer } from '../shared/ListContainer'

export interface StatsScreenProps {
  getHeadToHead: GetHeadToHeadUseCase
  getGameTypes: GetGameTypesUseCase
  /**
   * Called whenever the player-detail selection changes, with a function to
   * clear it (or null when back to the leaderboard). The app header's back
   * button has no visibility into this screen's own reducer state, so it
   * uses this to know whether "back" should clear the selection instead of
   * navigating Home — mirrors App.kt reading `statsHandler.state.selectedPlayerId`.
   */
  onBackOverrideChange?: (override: (() => void) | null) => void
}

function pct(wins: number, losses: number): number {
  const total = wins + losses
  return total === 0 ? 0 : Math.trunc((wins / total) * 100)
}

export function StatsScreen({ getHeadToHead, getGameTypes, onBackOverrideChange }: StatsScreenProps) {
  const [state, dispatch] = useReducer(statsReducer, initialStatsState)

  useEffect(() => {
    const { leaderboard, gameTypes } = loadStats(getHeadToHead, getGameTypes, state.selectedGameTypeId)
    dispatch({ type: 'loaded', leaderboard, gameTypes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedGameTypeId])

  useEffect(() => {
    onBackOverrideChange?.(state.selectedPlayerId !== undefined ? () => dispatch({ type: 'backToLeaderboard' }) : null)
  }, [state.selectedPlayerId, onBackOverrideChange])

  const detail = selectedPlayer(state)

  if (detail) {
    return <PlayerDetailView detail={detail} />
  }

  return (
    <>
      <GameTypeTabs
        gameTypes={state.gameTypes}
        selectedGameTypeId={state.selectedGameTypeId}
        onSelect={(gameTypeId) => dispatch({ type: 'selectGameType', gameTypeId })}
      />
      <LeaderboardView
        leaderboard={state.leaderboard}
        onSelectPlayer={(playerId) => dispatch({ type: 'selectPlayer', playerId })}
      />
    </>
  )
}

interface GameTypeTabsProps {
  gameTypes: GameType[]
  selectedGameTypeId: string | undefined
  onSelect: (gameTypeId: string | undefined) => void
}

function GameTypeTabs({ gameTypes, selectedGameTypeId, onSelect }: GameTypeTabsProps) {
  const { t } = useTranslation()
  return (
    <div className="tab-bar">
      <button
        type="button"
        className={selectedGameTypeId === undefined ? 'tab-btn active' : 'tab-btn'}
        onClick={() => onSelect(undefined)}
      >
        {t('stats.all')}
      </button>
      {gameTypes.map((gt) => (
        <button
          key={gt.id}
          type="button"
          className={selectedGameTypeId === gt.id ? 'tab-btn active' : 'tab-btn'}
          onClick={() => onSelect(gt.id)}
        >
          {gt.name}
        </button>
      ))}
    </div>
  )
}

interface LeaderboardViewProps {
  leaderboard: PlayerDetail[]
  onSelectPlayer: (playerId: string) => void
}

function LeaderboardView({ leaderboard, onSelectPlayer }: LeaderboardViewProps) {
  const { t } = useTranslation()
  if (leaderboard.length === 0) {
    return <div className="empty">{t('stats.noStatsYet')}</div>
  }

  return (
    <ListContainer>
      {leaderboard.map((detail) => {
        const rowPct = pct(detail.wins, detail.losses)
        return (
          <div key={detail.playerId} className="card stats-row" onClick={() => onSelectPlayer(detail.playerId)}>
            <div className="stats-row-info">
              <span className="stats-row-name">{detail.name}</span>
              <span className="stats-row-record">
                {detail.wins}W {detail.losses}L
              </span>
            </div>
            <span className="stats-elo">{detail.elo}</span>
            <div className="stats-row-bar-wrap">
              <div className="stats-row-bar" style={{ width: `${rowPct}%` }} />
            </div>
            <span className="stats-row-pct">{rowPct}%</span>
          </div>
        )
      })}
    </ListContainer>
  )
}

function PlayerDetailView({ detail }: { detail: PlayerDetail }) {
  const { t } = useTranslation()
  const overallPct = pct(detail.wins, detail.losses)

  return (
    <>
      <div className="stats-detail-header">
        <div className="stats-detail-title">{detail.name}</div>
        <span className="stats-elo-badge">{detail.elo}</span>
      </div>

      <div className="stats-detail-overall">
        <span className="stats-detail-record">
          {detail.wins}W / {detail.losses}L
        </span>
        <span className="stats-detail-pct">({overallPct}%)</span>
      </div>

      {detail.headToHead.length === 0 ? (
        <div className="empty">{t('stats.noHeadToHead')}</div>
      ) : (
        <>
          <div className="section-label">{t('stats.headToHead')}</div>
          {detail.headToHead.map((h2h) => {
            const hPct = pct(h2h.wins, h2h.losses)
            return (
              <div key={h2h.opponentId} className="stats-h2h-row">
                <div className="stats-row-info">
                  <span className="stats-h2h-name">{h2h.opponentName}</span>
                </div>
                <div className="stats-row-bar-wrap">
                  <div className="stats-row-bar" style={{ width: `${hPct}%` }} />
                </div>
                <span className="stats-h2h-record">
                  {h2h.wins} - {h2h.losses}
                </span>
              </div>
            )
          })}
        </>
      )}
    </>
  )
}
