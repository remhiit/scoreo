import type { ScoringModuleManifest } from '@scoreboards/module-api'
import {
  Button,
  ButtonRow,
  Dialog,
  EmptyState,
  Select,
  Stack,
  Text,
  TextInput,
} from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { WinCondition } from '../../domain/model/enums'
import { winConditionLabel } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'

export interface GameSelectModalProps {
  open: boolean
  onClose: () => void
  /**
   * Every game the user can start: existing game types first, then the
   * registered modules no game type is bound to yet, which only become a
   * `GameType` once one of them is actually played.
   */
  choices: readonly GameChoice[]
  selectedValue: string | undefined
  onSelectChoice: (choice: GameChoice) => void
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
  /** Set when the selected game is one a module can count, bound or not. */
  moduleForSelectedGame: ScoringModuleManifest | undefined
  /**
   * Whether the selected players fit the module's range: outside it the game
   * stays playable in Scoreo, only the module's own screen is off.
   */
  moduleFitsPlayers: boolean
  onStartOnModule: (moduleId: string) => void
}

/** One entry of the game list: a game type, or a module not bound to one yet. */
export type GameChoice =
  | { kind: 'gameType'; value: string; label: string; gameType: GameType }
  | { kind: 'module'; value: string; label: string; manifest: ScoringModuleManifest }

export function GameSelectModal({
  open,
  onClose,
  choices,
  selectedValue,
  onSelectChoice,
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
  moduleForSelectedGame,
  moduleFitsPlayers,
  onStartOnModule,
}: GameSelectModalProps) {
  const { t } = useTranslation()

  const addInlineGame = () => {
    if (inlineGameName.trim() !== '') onAddInlineGameType()
  }

  return (
    <Dialog
      open={open}
      title={t('home.selectGameTitle')}
      onClose={onClose}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={moduleForSelectedGame && moduleFitsPlayers ? 'secondary' : 'primary'}
            onClick={onStartMatch}
          >
            {moduleForSelectedGame ? t('modules.playInScoreo') : t('home.startMatch')}
          </Button>
          {/* A module augments a game, it never replaces it: both ways in stay
              offered for a game that has one. */}
          {moduleForSelectedGame && (
            <Button
              disabled={!moduleFitsPlayers}
              onClick={() => onStartOnModule(moduleForSelectedGame.moduleId)}
            >
              {t('modules.playOnModule')}
            </Button>
          )}
        </ButtonRow>
      }
    >
      {choices.length === 0 ? (
        <EmptyState>{t('home.noGameTypesYet')}</EmptyState>
      ) : (
        <Select
          ariaLabel={t('home.selectGameTitle')}
          value={selectedValue ?? ''}
          placeholder={t('home.selectGamePlaceholder')}
          options={choices.map((c) => ({ value: c.value, label: c.label }))}
          onChange={(value) => {
            const choice = choices.find((c) => c.value === value)
            if (choice) onSelectChoice(choice)
          }}
        />
      )}

      {moduleForSelectedGame && !moduleFitsPlayers && (
        <Text variant="hint">
          {t('modules.playerRange', {
            min: moduleForSelectedGame.minPlayers,
            max: moduleForSelectedGame.maxPlayers,
          })}
        </Text>
      )}

      <Stack direction="row" justify="center">
        <Button
          variant="secondary"
          icon={showAddGameForm ? 'minus' : 'plus'}
          onClick={onToggleAddGameForm}
        >
          {t('home.addNewGame')}
        </Button>
      </Stack>

      {showAddGameForm && (
        <Stack gap={2}>
          <TextInput
            value={inlineGameName}
            onChange={onChangeInlineGameName}
            ariaLabel={t('home.gameNamePlaceholder')}
            placeholder={t('home.gameNamePlaceholder')}
            invalid={inlineGameError !== undefined}
            onEnter={addInlineGame}
          />
          <Select
            ariaLabel={t('gametype.winCondition')}
            value={inlineGameWinCondition}
            options={(['HIGHEST_SCORE', 'LOWEST_SCORE', 'MANUAL'] as WinCondition[]).map((wc) => ({
              value: wc,
              label: winConditionLabel(wc),
            }))}
            onChange={(wc) => onChangeInlineGameWinCondition(wc as WinCondition)}
          />
          {inlineGameError && <Text variant="error">{inlineGameError}</Text>}
          <Button width="full" onClick={addInlineGame}>
            {t('home.addGame')}
          </Button>
        </Stack>
      )}

      {error && <Text variant="error">{error}</Text>}
    </Dialog>
  )
}
