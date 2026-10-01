import {
  Badge,
  EmptyState,
  Icon,
  List,
  Panel,
  Stack,
  StatRow,
  Text,
} from '@scoreboards/design-system'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetHeadToHeadUseCase, PlayerDetail } from '../../application/getHeadToHeadUseCase'
import type { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import type { PlayerTrophyBadge } from '../../application/groupTrophiesByPlayer'
import { loadStats, statsReducer } from './statsReducer'
import { initialStatsState, selectedPlayer } from './statsTypes'
import { GameTypeTabs } from '../shared/GameTypeTabs'
import { TROPHY_ICONS } from './trophyIcons'

export interface StatsScreenProps {
  getHeadToHead: GetHeadToHeadUseCase
  getGameTypes: GetGameTypesUseCase
  getTrophies: GetTrophiesUseCase
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

export function StatsScreen({
  getHeadToHead,
  getGameTypes,
  getTrophies,
  onBackOverrideChange,
}: StatsScreenProps) {
  const [state, dispatch] = useReducer(statsReducer, initialStatsState)

  useEffect(() => {
    const { leaderboard, gameTypes, trophiesByPlayer } = loadStats(
      getHeadToHead,
      getGameTypes,
      getTrophies,
      state.selectedGameTypeId,
    )
    dispatch({ type: 'loaded', leaderboard, gameTypes, trophiesByPlayer })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedGameTypeId])

  useEffect(() => {
    onBackOverrideChange?.(
      state.selectedPlayerId !== undefined ? () => dispatch({ type: 'backToLeaderboard' }) : null,
    )
  }, [state.selectedPlayerId, onBackOverrideChange])

  const detail = selectedPlayer(state)

  if (detail) {
    return (
      <PlayerDetailView
        detail={detail}
        badges={state.trophiesByPlayer.get(detail.playerId) ?? []}
      />
    )
  }

  return (
    <Stack gap={4}>
      <GameTypeTabs
        gameTypes={state.gameTypes}
        selectedGameTypeId={state.selectedGameTypeId}
        onSelect={(gameTypeId) => dispatch({ type: 'selectGameType', gameTypeId })}
      />
      <LeaderboardView
        leaderboard={state.leaderboard}
        onSelectPlayer={(playerId) => dispatch({ type: 'selectPlayer', playerId })}
      />
    </Stack>
  )
}

interface LeaderboardViewProps {
  leaderboard: PlayerDetail[]
  onSelectPlayer: (playerId: string) => void
}

function LeaderboardView({ leaderboard, onSelectPlayer }: LeaderboardViewProps) {
  const { t } = useTranslation()
  if (leaderboard.length === 0) {
    return <EmptyState>{t('stats.noStatsYet')}</EmptyState>
  }

  return (
    <List>
      {leaderboard.map((detail) => {
        const rowPct = pct(detail.wins, detail.losses)
        return (
          <StatRow
            key={detail.playerId}
            title={detail.name}
            subtitle={`${detail.wins}W ${detail.losses}L`}
            score={detail.elo}
            rate={rowPct / 100}
            value={`${rowPct}%`}
            onClick={() => onSelectPlayer(detail.playerId)}
          />
        )
      })}
    </List>
  )
}

function PlayerDetailView({
  detail,
  badges,
}: {
  detail: PlayerDetail
  badges: PlayerTrophyBadge[]
}) {
  const { t, i18n } = useTranslation()
  const overallPct = pct(detail.wins, detail.losses)

  return (
    <Stack gap={4}>
      <Stack direction="row" align="center" justify="between">
        <Text variant="heading">{detail.name}</Text>
        <Badge tone="accent">{detail.elo}</Badge>
      </Stack>

      <StatRow
        title={`${detail.wins}W / ${detail.losses}L`}
        rate={overallPct / 100}
        value={`${overallPct}%`}
      />

      {detail.headToHead.length === 0 ? (
        <EmptyState>{t('stats.noHeadToHead')}</EmptyState>
      ) : (
        <Panel title={t('stats.headToHead')}>
          {detail.headToHead.map((h2h) => {
            const hPct = pct(h2h.wins, h2h.losses)
            return (
              <StatRow
                key={h2h.opponentId}
                variant="line"
                title={h2h.opponentName}
                rate={hPct / 100}
                value={`${h2h.wins} - ${h2h.losses}`}
              />
            )
          })}
        </Panel>
      )}

      <Panel title={t('stats.trophies')}>
        {badges.length === 0 ? (
          <EmptyState>{t('stats.noTrophies')}</EmptyState>
        ) : (
          <Stack direction="row" gap={2} wrap>
            {badges.map(({ trophy, holder }, index) => {
              const title = t(`hallOfFame.trophies.${trophy.id}.title`)
              const badgeTitle = holder.period
                ? t('hallOfFame.badgePeriod', {
                    title,
                    period: new Date(holder.period.year, holder.period.month, 1).toLocaleDateString(
                      i18n.language,
                      {
                        month: 'short',
                        year: 'numeric',
                      },
                    ),
                  })
                : title
              return (
                <Badge
                  key={`${trophy.id}-${index}`}
                  label={
                    <>
                      <Icon name={TROPHY_ICONS[trophy.id] ?? 'trophy'} size="sm" />
                      {badgeTitle}
                    </>
                  }
                >
                  {holder.value}
                  {trophy.unit ? ` ${t(`hallOfFame.units.${trophy.unit}`)}` : ''}
                </Badge>
              )
            })}
          </Stack>
        )}
      </Panel>
    </Stack>
  )
}
