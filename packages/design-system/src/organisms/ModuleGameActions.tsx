import type { ReactNode } from 'react'
import { Button } from '../atoms/Button'
import { ButtonRow } from '../molecules/FormRow'
import { ActionBar } from './ActionBar'

export interface ModuleGameActionsLabels {
  undo: string
  abandon: string
  save: string
  /** Only for a game the players end themselves (`onEnd`). */
  end?: string
}

interface ModuleGameActionsBase {
  labels: ModuleGameActionsLabels
  onUndo: () => void
  /** Nothing to undo yet. */
  undoDisabled?: boolean
}

/** During the game: undo and abandon in a row under it. */
interface PlayingActionsProps extends ModuleGameActionsBase {
  phase: 'playing'
  onAbandon: () => void
  /** A game the players end by hand (1000 Sabords): a flag action between undo and abandon. */
  onEnd?: () => void
  endDisabled?: boolean
  onSave?: undefined
  children?: undefined
}

/** Once over: saving is what the screen is for, full width in the bottom bar, undo under it. */
interface FinishedActionsProps extends ModuleGameActionsBase {
  phase: 'finished'
  onSave: () => void
  /** Further secondary actions, after undo (e.g. resume). */
  children?: ReactNode
  onAbandon?: undefined
  onEnd?: undefined
  endDisabled?: undefined
}

export type ModuleGameActionsProps = PlayingActionsProps | FinishedActionsProps

/**
 * The actions every scoring module offers around a game: undo the last round,
 * abandon it, save it once over. One component so they read the same in every
 * game, with icons from the closed set.
 */
export function ModuleGameActions(props: ModuleGameActionsProps) {
  const { labels, onUndo, undoDisabled = false } = props
  const undo = (
    <Button variant="secondary" icon="undo" disabled={undoDisabled} onClick={onUndo}>
      {labels.undo}
    </Button>
  )
  if (props.phase === 'finished') {
    return (
      <ActionBar>
        <Button width="full" icon="save" onClick={props.onSave}>
          {labels.save}
        </Button>
        <ButtonRow>
          {undo}
          {props.children}
        </ButtonRow>
      </ActionBar>
    )
  }
  return (
    <ButtonRow>
      {undo}
      {props.onEnd && labels.end !== undefined && (
        <Button
          variant="secondary"
          icon="flag"
          disabled={props.endDisabled ?? false}
          onClick={props.onEnd}
        >
          {labels.end}
        </Button>
      )}
      <Button variant="danger" icon="delete" onClick={props.onAbandon}>
        {labels.abandon}
      </Button>
    </ButtonRow>
  )
}
