import {
  Button,
  DetailList,
  DetailRow,
  Select,
  Stack,
  Text,
  TextInput,
} from '@scoreboards/design-system'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  hasModuleRules,
  scoringModeChangeWarning,
  showsPlayerRange,
  showsScoringModeChoice,
  type GameTypeAction,
} from './gameTypeReducer'
import type { GameTypeState } from './gameTypeTypes'
import {
  ScoringModeSchema,
  TieBreakRuleSchema,
  WinConditionSchema,
  tieBreakRuleLabel,
  scoringModeLabel,
  winConditionLabel,
} from '../../domain/model/enums'

export interface GameTypeFieldsProps {
  state: GameTypeState
  dispatch: (action: GameTypeAction) => void
}

function moduleRange(
  range: { minPlayers: number | null; maxPlayers: number | null },
  t: TFunction,
): string {
  if (range.minPlayers !== null && range.maxPlayers !== null) {
    return t('home.playerRange', { min: range.minPlayers, max: range.maxPlayers })
  }
  if (range.minPlayers !== null) return t('home.playerRangeMin', { min: range.minPlayers })
  if (range.maxPlayers !== null) return t('home.playerRangeMax', { max: range.maxPlayers })
  return t('gametype.playerLimitPlaceholder')
}

/** Win condition / tie-break / player range fields, shared by the add form and the edit modal. */
export function GameTypeFields({ state, dispatch }: GameTypeFieldsProps) {
  const { t } = useTranslation()
  const moduleGame = hasModuleRules(state)
    ? state.gameTypes.find((gt) => gt.id === state.editingGameId)
    : undefined

  return (
    <Stack gap={3}>
      {moduleGame ? (
        <>
          <DetailList boxed>
            <DetailRow
              label={t('gametype.winCondition')}
              value={t(`gametype.winConditions.${state.selectedWinCondition}`)}
            />
            <DetailRow
              label={t('gametype.scoringMode')}
              value={t(`gametype.scoringModes.${state.selectedScoringMode}`)}
            />
            <DetailRow label={t('gametype.playerRange')} value={moduleRange(moduleGame, t)} />
          </DetailList>
          <Text variant="hint">{t('gametype.moduleRulesNote')}</Text>
        </>
      ) : (
        <Select
          label={t('gametype.winCondition')}
          value={state.selectedWinCondition}
          options={WinConditionSchema.options.map((wc) => ({
            value: wc,
            label: winConditionLabel(wc),
          }))}
          onChange={(wc) =>
            dispatch({
              type: 'selectWinCondition',
              winCondition: wc as GameTypeState['selectedWinCondition'],
            })
          }
        />
      )}

      {showsScoringModeChoice(state) && (
        <Select
          label={t('gametype.scoringMode')}
          value={state.selectedScoringMode}
          options={ScoringModeSchema.options.map((mode) => ({
            value: mode,
            label: t(`gametype.scoringModes.${mode}`, { defaultValue: scoringModeLabel(mode) }),
          }))}
          onChange={(mode) =>
            dispatch({
              type: 'selectScoringMode',
              scoringMode: mode as GameTypeState['selectedScoringMode'],
            })
          }
        />
      )}

      {scoringModeChangeWarning(state) && (
        <Text variant="warning">{t('gametype.scoringModeChangeWarning')}</Text>
      )}

      <Select
        label={t('gametype.tieBreakRule')}
        value={state.selectedTieBreakRule}
        options={TieBreakRuleSchema.options.map((rule) => ({
          value: rule,
          label: tieBreakRuleLabel(rule),
        }))}
        onChange={(rule) =>
          dispatch({
            type: 'updateTieBreakRule',
            rule: rule as GameTypeState['selectedTieBreakRule'],
          })
        }
      />

      {state.selectedTieBreakRule === 'SECONDARY_SCORE' && (
        <>
          <Select
            label={t('gametype.tieBreakConditionLabel')}
            value={state.selectedTieBreakCondition}
            options={WinConditionSchema.options.map((cond) => ({
              value: cond,
              label: winConditionLabel(cond),
            }))}
            onChange={(condition) =>
              dispatch({
                type: 'updateTieBreakCondition',
                condition: condition as GameTypeState['selectedTieBreakCondition'],
              })
            }
          />
          <TextInput
            label={t('gametype.tieBreakQuestionLabel')}
            value={state.selectedTieBreakLabel ?? ''}
            onChange={(label) => dispatch({ type: 'updateTieBreakLabel', label })}
            placeholder={t('gametype.tieBreakLabelPlaceholder')}
          />
        </>
      )}

      {showsPlayerRange(state) && (
        <>
          <TextInput
            label={t('gametype.minPlayers')}
            value={state.selectedMinPlayers}
            onChange={(value) => dispatch({ type: 'updateMinPlayers', value })}
            placeholder={t('gametype.playerLimitPlaceholder')}
          />
          <TextInput
            label={t('gametype.maxPlayers')}
            value={state.selectedMaxPlayers}
            onChange={(value) => dispatch({ type: 'updateMaxPlayers', value })}
            placeholder={t('gametype.playerLimitPlaceholder')}
          />
        </>
      )}
    </Stack>
  )
}

export interface GameTypeFormProps extends GameTypeFieldsProps {
  onSubmit: () => void
}

/** Add-game-type form. Hidden while editing (the edit modal reuses GameTypeFields instead). */
export function GameTypeForm({ state, dispatch, onSubmit }: GameTypeFormProps) {
  const { t } = useTranslation()

  if (state.editingGameId !== undefined) return null

  return (
    <Stack gap={3}>
      <TextInput
        value={state.inputName}
        onChange={(name) => dispatch({ type: 'updateName', name })}
        ariaLabel={t('gametype.gameNamePlaceholder')}
        placeholder={t('gametype.gameNamePlaceholder')}
        onEnter={onSubmit}
      />

      <GameTypeFields state={state} dispatch={dispatch} />

      <Button width="full" icon="plus" onClick={onSubmit}>
        {t('gametype.addGameType')}
      </Button>
    </Stack>
  )
}
