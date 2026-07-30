import { X } from 'lucide-react'
import type { Player } from '../../domain/model/player'
import { LudoButton } from '../shared/LudoButton'

export interface RoundHistoryListProps {
  rounds: Record<string, string>[]
  players: Player[]
  onChangeScore: (roundIndex: number, playerId: string, value: string) => void
  onRemoveRound: (index: number) => void
  onAddRound: () => void
}

/**
 * One `.hist-round` card per round, cells wrapping instead of scrolling
 * sideways — replaces `.score-table` (a column per player breaks down past
 * ~4 players). Remove stays disabled while a single round remains, same as
 * the table it replaces.
 */
export function RoundHistoryList({ rounds, players, onChangeScore, onRemoveRound, onAddRound }: RoundHistoryListProps) {
  const canRemove = rounds.length > 1

  return (
    <>
      {rounds.map((round, roundIndex) => (
        <div key={roundIndex} className="hist-round">
          <div className="hist-round-head">
            <span>Round {roundIndex + 1}</span>
            {canRemove && (
              <button
                type="button"
                className="btn-icon btn-icon--danger"
                title="Remove round"
                onClick={() => onRemoveRound(roundIndex)}
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </div>
          <div className="hist-cells">
            {players.map((player) => (
              <span key={player.id} className="hist-cell">
                <span>{player.name}</span>
                <input
                  type="number"
                  className="ludo-input ludo-input--sm ludo-input--stepper-field ludo-input--mono"
                  inputMode="numeric"
                  value={round[player.id] ?? ''}
                  onChange={(e) => onChangeScore(roundIndex, player.id, e.target.value)}
                />
              </span>
            ))}
          </div>
        </div>
      ))}

      <div className="hist-add">
        <LudoButton text="Add round" variant="secondary" size="sm" onClick={onAddRound} />
      </div>
    </>
  )
}
