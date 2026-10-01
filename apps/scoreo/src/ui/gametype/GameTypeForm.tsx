import { Button, Select, Stack, TextInput } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { GameTypeAction } from './gameTypeReducer'
import type { GameTypeState } from './gameTypeTypes'
import {
  TieBreakRuleSchema,
  WinConditionSchema,
  tieBreakRuleLabel,
  winConditionLabel,
} from '../../domain/model/enums'

export interface GameTypeFieldsProps {
  state: GameTypeState
  dispatch: (action: GameTypeAction) => void
}

/** Win condition / tie-break fields, shared by the add form and the edit modal. */
export function GameTypeFields({ state, dispatch }: GameTypeFieldsProps) {
  const { t } = useTranslation()

  return (
    <Stack gap={3}>
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
