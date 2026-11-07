// Small stateful demos the organisms stories render. Kept apart from the stories
// so each file exports components only (fast refresh), or data only.
import { useState } from 'react'
import {
  Button,
  NumberInput,
  Sheet,
  SheetRow,
  ThemePicker,
  type Hue,
} from '@scoreboards/design-system'

const FLAVORS = [
  { value: 'latte', label: 'Latte' },
  { value: 'frappe', label: 'Frappé' },
  { value: 'macchiato', label: 'Macchiato' },
  { value: 'mocha', label: 'Mocha' },
]

const ACCENTS: { value: Hue; label: string }[] = [
  { value: 'mauve', label: 'Mauve' },
  { value: 'blue', label: 'Bleu' },
  { value: 'green', label: 'Vert' },
  { value: 'peach', label: 'Pêche' },
]

const noop = () => {}

export function ThemePickerDemo() {
  const [flavor, setFlavor] = useState('mocha')
  const [accent, setAccent] = useState<Hue>('mauve')
  return (
    <ThemePicker
      flavors={FLAVORS}
      flavor={flavor}
      onFlavorChange={setFlavor}
      accents={ACCENTS}
      accent={accent}
      onAccentChange={setAccent}
      flavorLabel="Thème"
      accentLabel="Accent"
    />
  )
}

export function SheetDemo() {
  const [scores, setScores] = useState({ alice: 3, bruno: 12 })
  return (
    <Sheet
      open
      title="Manche 4"
      onClose={noop}
      actions={
        <Button width="full" onClick={noop}>
          Valider la manche
        </Button>
      }
    >
      <SheetRow name="Alice" meta="Total 42">
        <NumberInput
          ariaLabel="Score d’Alice"
          mode="stepper"
          value={scores.alice}
          onChange={(alice) => setScores((s) => ({ ...s, alice }))}
          decreaseLabel="Diminuer"
          increaseLabel="Augmenter"
        />
      </SheetRow>
      <SheetRow name="Bruno" meta="Total 57">
        <NumberInput
          ariaLabel="Score de Bruno"
          mode="stepper"
          value={scores.bruno}
          onChange={(bruno) => setScores((s) => ({ ...s, bruno }))}
          decreaseLabel="Diminuer"
          increaseLabel="Augmenter"
        />
      </SheetRow>
    </Sheet>
  )
}
