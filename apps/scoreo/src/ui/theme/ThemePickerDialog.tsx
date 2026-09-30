import { Button, ButtonRow, Dialog, ThemePicker } from '@scoreboards/design-system'
import { ACCENTS, FLAVORS } from './themeManager'
import { useTheme } from './useTheme'

export interface ThemePickerDialogProps {
  onClose: () => void
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/** Flavor + accent picker, opened from the burger menu. */
export function ThemePickerDialog({ onClose }: ThemePickerDialogProps) {
  const { flavor, accent, setFlavor, setAccent } = useTheme()

  return (
    <Dialog
      open
      title="Theme"
      onClose={onClose}
      actions={
        <ButtonRow align="end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </ButtonRow>
      }
    >
      <ThemePicker
        flavorLabel="Flavor"
        accentLabel="Accent"
        flavors={FLAVORS.map((f) => ({ value: f, label: capitalize(f) }))}
        flavor={flavor}
        onFlavorChange={setFlavor}
        accents={ACCENTS.map((a) => ({ value: a, label: a }))}
        accent={accent}
        onAccentChange={setAccent}
      />
    </Dialog>
  )
}
