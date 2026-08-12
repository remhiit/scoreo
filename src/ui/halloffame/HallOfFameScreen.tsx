import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameType } from '../../domain/model/gameType'
import type { Trophy, TrophyHolder } from '../../domain/model/trophy'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { NEMESIS_MIN_MEETINGS, REGULAR_MIN_MATCHES, type GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { hallOfFameReducer, loadHallOfFame } from './hallOfFameReducer'
import { initialHallOfFameState } from './hallOfFameTypes'

export interface HallOfFameScreenProps {
  getTrophies: GetTrophiesUseCase
  getGameTypes: GetGameTypesUseCase
}

export function HallOfFameScreen({ getTrophies, getGameTypes }: HallOfFameScreenProps) {
  const [state, dispatch] = useReducer(hallOfFameReducer, initialHallOfFameState)

  useEffect(() => {
    const { trophies, gameTypes } = loadHallOfFame(getTrophies, getGameTypes, state.selectedGameTypeId)
    dispatch({ type: 'loaded', trophies, gameTypes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedGameTypeId])

  return (
    <>
      <GameTypeTabs
        gameTypes={state.gameTypes}
        selectedGameTypeId={state.selectedGameTypeId}
        onSelect={(gameTypeId) => dispatch({ type: 'selectGameType', gameTypeId })}
      />
      <div className="trophy-list">
        {state.trophies.map((trophy) => (
          <TrophyCard key={trophy.id} trophy={trophy} />
        ))}
      </div>
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

const DESCRIPTION_OPTIONS: Record<string, Record<string, number>> = {
  b3: { minMatches: REGULAR_MIN_MATCHES },
  e1: { minMeetings: NEMESIS_MIN_MEETINGS },
}

/** Stable key for a holder row — disambiguates holders sharing a playerId (e.g. D1's per-game-type records). */
function holderKey(holder: TrophyHolder): string {
  const { detail } = holder
  if (detail === undefined) return holder.playerId
  if (typeof detail === 'string') return `${holder.playerId}-${detail}`
  if (detail.kind === 'date') return `${holder.playerId}-${detail.epochMs}`
  if (detail.kind === 'ratio') return `${holder.playerId}-${detail.wins}-${detail.played}`
  return `${holder.playerId}-${detail.brokenPlayerName}`
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
        return new Date(detail.epochMs).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }

  return (
    <div className="card trophy-card">
      <div className="trophy-card-title">{t(`hallOfFame.trophies.${trophy.id}.title`)}</div>
      <div className="trophy-card-description">{t(`hallOfFame.trophies.${trophy.id}.description`, DESCRIPTION_OPTIONS[trophy.id])}</div>
      {trophy.holders.length === 0 ? (
        <div className="empty trophy-card-empty">{t('hallOfFame.noRecordYet')}</div>
      ) : (
        <div className="trophy-holders">
          {trophy.holders.map((holder) => {
            const detailText = holderDetailText(holder.detail)
            return (
              <div key={holderKey(holder)} className="trophy-holder">
                <div className="trophy-holder-info">
                  <span className="trophy-holder-name">{holder.name}</span>
                  {detailText && <span className="trophy-holder-detail">{detailText}</span>}
                </div>
                <span className="trophy-holder-value">
                  {holder.value}
                  {trophy.unit ? ` ${t(`hallOfFame.units.${trophy.unit}`)}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
