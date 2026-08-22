import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { useTranslation } from 'react-i18next'
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
  /**
   * Modules that can count this many players and have no game type of their own
   * yet — a module already bound shows up in the list above instead.
   */
  availableModules: readonly ScoringModuleManifest[]
  /** Set when the selected game type is one a module can count. */
  moduleForSelectedGame: ScoringModuleManifest | undefined
  onStartOnModule: (moduleId: string) => void
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
  availableModules,
  moduleForSelectedGame,
  onStartOnModule,
}: GameSelectModalProps) {
  const { t } = useTranslation()

  return (
    <LudoModal
      open={open}
      title={t('home.selectGameTitle')}
      onClose={onClose}
      footer={
        <>
          <LudoButton text={t('common.cancel')} variant="secondary" onClick={onClose} />
          <LudoButton
            text={moduleForSelectedGame ? t('modules.playInScoreo') : t('home.startMatch')}
            variant={moduleForSelectedGame ? 'secondary' : 'primary'}
            onClick={onStartMatch}
          />
          {/* A module augments a game, it never replaces it: both ways in stay
              offered for a game type that has one. */}
          {moduleForSelectedGame && (
            <LudoButton
              text={t('modules.playOnModule')}
              variant="primary"
              onClick={() => onStartOnModule(moduleForSelectedGame.moduleId)}
            />
          )}
        </>
      }
    >
      {gameTypes.length === 0 ? (
        <div className="empty-inline">{t('home.noGameTypesYet')}</div>
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
            <option value="">{t('home.selectGamePlaceholder')}</option>
            {gameTypes.map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {availableModules.length > 0 && (
        <div className="module-section">
          <div className="module-section-title">{t('modules.availableModules')}</div>
          {availableModules.map((manifest) => (
            <LudoButton
              key={manifest.moduleId}
              text={`${manifest.displayName} — ${t('modules.playerRange', {
                min: manifest.minPlayers,
                max: manifest.maxPlayers,
              })}`}
              variant="secondary"
              className="ludo-btn--full"
              onClick={() => onStartOnModule(manifest.moduleId)}
            />
          ))}
        </div>
      )}

      <div className="modal-row">
        <LudoButton
          text={showAddGameForm ? '−' : '＋'}
          variant="secondary"
          iconOnly
          onClick={onToggleAddGameForm}
        />
        <span>{t('home.addNewGame')}</span>
      </div>

      {showAddGameForm && (
        <div className="inline-form">
          <LudoTextInput
            value={inlineGameName}
            onChange={onChangeInlineGameName}
            placeholder={t('home.gameNamePlaceholder')}
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
            text={t('home.addGame')}
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
