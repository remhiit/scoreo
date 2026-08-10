import { useEffect, useReducer } from 'react'
import type { GameType } from '../../domain/model/gameType'
import type { Trophy } from '../../domain/model/trophy'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
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
  return (
    <div className="tab-bar">
      <button
        type="button"
        className={selectedGameTypeId === undefined ? 'tab-btn active' : 'tab-btn'}
        onClick={() => onSelect(undefined)}
      >
        All
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

function TrophyCard({ trophy }: { trophy: Trophy }) {
  return (
    <div className="card trophy-card">
      <div className="trophy-card-title">{trophy.title}</div>
      <div className="trophy-card-description">{trophy.description}</div>
      {trophy.holders.length === 0 ? (
        <div className="empty trophy-card-empty">No record yet.</div>
      ) : (
        <div className="trophy-holders">
          {trophy.holders.map((holder) => (
            <div key={`${holder.playerId}-${holder.detail ?? ''}`} className="trophy-holder">
              <div className="trophy-holder-info">
                <span className="trophy-holder-name">{holder.name}</span>
                {holder.detail && <span className="trophy-holder-detail">{holder.detail}</span>}
              </div>
              <span className="trophy-holder-value">
                {holder.value}
                {trophy.unit ? ` ${trophy.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
