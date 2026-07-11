import type { GameType } from '../../domain/model/gameType'
import type { Player } from '../../domain/model/player'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'

export interface SecondaryScoreDialogProps {
  gameType: GameType
  tiedPlayers: Player[]
  secondaryScoreInputs: Record<string, string>
  error: string | undefined
  onUpdateInput: (playerId: string, value: string) => void
  onSubmit: () => void
  onDismiss: () => void
}

/** Dialog for entering secondary scores to break a tie, titled from the game type's tieBreakLabel. */
export function SecondaryScoreDialog({
  gameType,
  tiedPlayers,
  secondaryScoreInputs,
  error,
  onUpdateInput,
  onSubmit,
  onDismiss,
}: SecondaryScoreDialogProps) {
  const title = gameType.tieBreakLabel ?? 'Secondary score'
  return (
    <LudoModal
      open
      title={`${title} ?`}
      onClose={onDismiss}
      footer={
        <>
          <LudoButton text="Cancel" variant="secondary" onClick={onDismiss} />
          <LudoButton text="Confirm" variant="primary" onClick={onSubmit} />
        </>
      }
    >
      {tiedPlayers.map((player) => (
        <div key={player.id} className="modal-row">
          <span>{player.name}</span>
          <input
            type="number"
            className="ludo-input ludo-input--sm ludo-input--stepper-field ludo-input--mono"
            value={secondaryScoreInputs[player.id] ?? ''}
            onChange={(e) => onUpdateInput(player.id, e.target.value)}
          />
        </div>
      ))}
      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
