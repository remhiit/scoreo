import { ActionBar, Button, ButtonRow, type IconName } from '@scoreboards/design-system'

// Sketch — the shared bar every scoring module redraws by hand today (Flip 7,
// Skyjo, 1000 Sabords). Once validated, it moves into the design system as an
// organism (packages/design-system/src/organisms/), with its test and story,
// and this file goes.

export interface ModuleGameActionsProps {
  phase: 'playing' | 'finished'
  onUndo: () => void
  undoDisabled?: boolean
  onAbandon: () => void
  onSave: () => void
  labels: { undo: string; abandon: string; save: string }
  /** Stand-ins until `undo` and `save` join the icon set. */
  icons?: { undo: IconName; save: IconName }
}

export function ModuleGameActions({
  phase,
  onUndo,
  undoDisabled = false,
  onAbandon,
  onSave,
  labels,
  icons = { undo: 'back', save: 'check' },
}: ModuleGameActionsProps) {
  if (phase === 'finished') {
    return (
      <ActionBar>
        <Button width="full" icon={icons.save} onClick={onSave}>
          {labels.save}
        </Button>
        <ButtonRow>
          <Button variant="secondary" icon={icons.undo} onClick={onUndo}>
            {labels.undo}
          </Button>
        </ButtonRow>
      </ActionBar>
    )
  }
  return (
    <ButtonRow>
      <Button variant="secondary" icon={icons.undo} disabled={undoDisabled} onClick={onUndo}>
        {labels.undo}
      </Button>
      <Button variant="danger" icon="delete" onClick={onAbandon}>
        {labels.abandon}
      </Button>
    </ButtonRow>
  )
}
