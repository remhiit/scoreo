import { EmptyState, Panel, Stack, StatRow, Text } from '@scoreboards/design-system'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { Trophy, TrophyHolder, TrophyPeriod } from '../../domain/model/trophy'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import {
  NEMESIS_MIN_MEETINGS,
  REGULAR_MIN_MATCHES,
  type GetTrophiesUseCase,
} from '../../application/getTrophiesUseCase'
import { GameTypeTabs } from '../shared/GameTypeTabs'
import { hallOfFameReducer, loadHallOfFame } from './hallOfFameReducer'
import { initialHallOfFameState } from './hallOfFameTypes'

export interface HallOfFameScreenProps {
  getTrophies: GetTrophiesUseCase
  getGameTypes: GetGameTypesUseCase
}

export function HallOfFameScreen({ getTrophies, getGameTypes }: HallOfFameScreenProps) {
  const [state, dispatch] = useReducer(hallOfFameReducer, initialHallOfFameState)

  useEffect(() => {
    const { trophies, gameTypes } = loadHallOfFame(
      getTrophies,
      getGameTypes,
      state.selectedGameTypeId,
    )
    dispatch({ type: 'loaded', trophies, gameTypes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedGameTypeId])

  return (
    <Stack gap={4}>
      <GameTypeTabs
        gameTypes={state.gameTypes}
        selectedGameTypeId={state.selectedGameTypeId}
        onSelect={(gameTypeId) => dispatch({ type: 'selectGameType', gameTypeId })}
      />
      <Stack gap={3}>
        {state.trophies.map((trophy) => (
          <TrophyCard key={trophy.id} trophy={trophy} />
        ))}
      </Stack>
    </Stack>
  )
}

const DESCRIPTION_OPTIONS: Record<string, Record<string, number>> = {
  b3: { minMatches: REGULAR_MIN_MATCHES },
  e1: { minMeetings: NEMESIS_MIN_MEETINGS },
}

/** Stable key for a holder row — disambiguates holders sharing a playerId (e.g. D1's per-game-type records, F3's multiple monthly titles). */
function holderKey(holder: TrophyHolder): string {
  const { detail, period } = holder
  const periodSuffix = period ? `-${period.year}-${period.month}` : ''
  if (detail === undefined) return `${holder.playerId}${periodSuffix}`
  if (typeof detail === 'string') return `${holder.playerId}-${detail}${periodSuffix}`
  if (detail.kind === 'date') return `${holder.playerId}-${detail.epochMs}${periodSuffix}`
  if (detail.kind === 'ratio')
    return `${holder.playerId}-${detail.wins}-${detail.played}${periodSuffix}`
  return `${holder.playerId}-${detail.brokenPlayerName}${periodSuffix}`
}

interface HolderMonthGroup {
  period: TrophyPeriod
  holders: TrophyHolder[]
}

/** Groups consecutive holders sharing the same period — holders already arrive sorted most-recent-period-first. */
function groupHoldersByMonth(holders: TrophyHolder[]): HolderMonthGroup[] {
  const groups: HolderMonthGroup[] = []
  for (const holder of holders) {
    if (!holder.period) continue
    const last = groups[groups.length - 1]
    if (
      last &&
      last.period.year === holder.period.year &&
      last.period.month === holder.period.month
    ) {
      last.holders.push(holder)
    } else {
      groups.push({ period: holder.period, holders: [holder] })
    }
  }
  return groups
}

function TrophyCard({ trophy }: { trophy: Trophy }) {
  const { t, i18n } = useTranslation()

  function holderDetailText(detail: TrophyHolder['detail']): string | undefined {
    if (detail === undefined) return undefined
    if (typeof detail === 'string') return detail
    switch (detail.kind) {
      case 'ratio':
        return t('hallOfFame.trophies.b3.detail', { wins: detail.wins, played: detail.played })
      case 'streakBroken':
        return t('hallOfFame.trophies.a4.detail', { brokenPlayerName: detail.brokenPlayerName })
      case 'date':
        return new Date(detail.epochMs).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
    }
  }

  function renderHolder(holder: TrophyHolder) {
    return (
      <StatRow
        key={holderKey(holder)}
        variant="line"
        title={holder.name}
        subtitle={holderDetailText(holder.detail)}
        value={`${holder.value}${trophy.unit ? ` ${t(`hallOfFame.units.${trophy.unit}`)}` : ''}`}
      />
    )
  }

  const monthGroups = trophy.id === 'f3' ? groupHoldersByMonth(trophy.holders) : null

  return (
    <Panel
      title={t(`hallOfFame.trophies.${trophy.id}.title`)}
      description={t(
        `hallOfFame.trophies.${trophy.id}.description`,
        DESCRIPTION_OPTIONS[trophy.id],
      )}
    >
      {trophy.holders.length === 0 ? (
        <EmptyState>{t('hallOfFame.noRecordYet')}</EmptyState>
      ) : monthGroups ? (
        monthGroups.map((group) => (
          <Stack key={`${group.period.year}-${group.period.month}`} gap={1}>
            <Text variant="label">
              {new Date(group.period.year, group.period.month, 1).toLocaleDateString(
                i18n.language,
                {
                  month: 'long',
                  year: 'numeric',
                },
              )}
            </Text>
            <Stack gap={0}>{group.holders.map(renderHolder)}</Stack>
          </Stack>
        ))
      ) : (
        <Stack gap={0}>{trophy.holders.map(renderHolder)}</Stack>
      )}
    </Panel>
  )
}
