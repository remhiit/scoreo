import type { WinCondition } from '../../domain/model/enums'
import { winConditionLabel } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { LudoTextInput } from '../shared/LudoTextInput'

export interface GameSelectModalProps {
  open: boolean
  onClose: () => void
  gameTypes: GameType[]
  selectedGameType: GameType | undefined
  onSelectGameType: (gameType: GameType) => void
  onStartMatch: () => void
  error: string | undefined
  showAddGameForm: boolean
  onToggleAddGameForm: () => void
  inlineGameName: string
  onChangeInlineGameName: (name: string) => void
  inlineGameWinCondition: WinCondition
  onChangeInlineGameWinCondition: (winCondition: WinCondition) => void
  inlineGameError: string | undefined
  onAddInlineGameType: () => void
}

export function GameSelectModal({
  open,
  onClose,
  gameTypes,
  selectedGameType,
  onSelectGameType,
  onStartMatch,
  error,
  showAddGameForm,
  onToggleAddGameForm,
  inlineGameName,
  onChangeInlineGameName,
  inlineGameWinCondition,
  onChangeInlineGameWinCondition,
  inlineGameError,
  onAddInlineGameType,
}: GameSelectModalProps) {
  return (
    <LudoModal
      open={open}
      title="Select a game"
      onClose={onClose}
      footer={
        <>
          <LudoButton text="Cancel" variant="secondary" onClick={onClose} />
          <LudoButton text="Start match" variant="primary" onClick={onStartMatch} />
        </>
      }
    >
      {gameTypes.length === 0 ? (
        <div className="empty-inline">No game types yet. Add one.</div>
      ) : (
        <div className="select-chevron">
          <select
            className="select"
            value={selectedGameType?.id ?? ''}
            onChange={(e) => {
              const gt = gameTypes.find((g) => g.id === e.target.value)
              if (gt) onSelectGameType(gt)
            }}
          >
            <option value="">— Select a game —</option>
            {gameTypes.map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="modal-row">
        <LudoButton
          text={showAddGameForm ? '−' : '＋'}
          variant="secondary"
          iconOnly
          onClick={onToggleAddGameForm}
        />
        <span>Add new game</span>
      </div>

      {showAddGameForm && (
        <div className="inline-form">
          <LudoTextInput
            value={inlineGameName}
            onChange={onChangeInlineGameName}
            placeholder="Game name"
            invalid={inlineGameError !== undefined}
            onEnter={() => {
              if (inlineGameName.trim() !== '') onAddInlineGameType()
            }}
          />
          <div className="select-chevron">
            <select
              className="select"
              value={inlineGameWinCondition}
              onChange={(e) => onChangeInlineGameWinCondition(e.target.value as WinCondition)}
            >
              {(['HIGHEST_SCORE', 'LOWEST_SCORE', 'MANUAL'] as WinCondition[]).map((wc) => (
                <option key={wc} value={wc}>
                  {winConditionLabel(wc)}
                </option>
              ))}
            </select>
          </div>
          {inlineGameError && <div className="error-msg">{inlineGameError}</div>}
          <LudoButton
            text="Add game"
            variant="primary"
            className="ludo-btn--full"
            onClick={() => {
              if (inlineGameName.trim() !== '') onAddInlineGameType()
            }}
          />
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}
    </LudoModal>
  )
}
