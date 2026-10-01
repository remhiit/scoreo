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
          <Button variant={moduleForSelectedGame ? 'secondary' : 'primary'} onClick={onStartMatch}>
            {moduleForSelectedGame ? t('modules.playInScoreo') : t('home.startMatch')}
          </Button>
          {/* A module augments a game, it never replaces it: both ways in stay
              offered for a game type that has one. */}
          {moduleForSelectedGame && (
            <Button onClick={() => onStartOnModule(moduleForSelectedGame.moduleId)}>
              {t('modules.playOnModule')}
            </Button>
          )}
        </ButtonRow>
      }
    >
      {gameTypes.length === 0 ? (
        <EmptyState>{t('home.noGameTypesYet')}</EmptyState>
      ) : (
        <Select
          ariaLabel={t('home.selectGameTitle')}
          value={selectedGameType?.id ?? ''}
          placeholder={t('home.selectGamePlaceholder')}
          options={gameTypes.map((gt) => ({ value: gt.id, label: gt.name }))}
          onChange={(id) => {
            const gt = gameTypes.find((g) => g.id === id)
            if (gt) onSelectGameType(gt)
          }}
        />
      )}

      {availableModules.length > 0 && (
        <Stack gap={2}>
          <Text variant="label">{t('modules.availableModules')}</Text>
          {availableModules.map((manifest) => (
            <Button
              key={manifest.moduleId}
              variant="secondary"
              width="full"
              onClick={() => onStartOnModule(manifest.moduleId)}
            >
              {`${manifest.displayName} — ${t('modules.playerRange', {
                min: manifest.minPlayers,
                max: manifest.maxPlayers,
              })}`}
            </Button>
          ))}
        </Stack>
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
