// Small stateful demos the atoms stories render. Kept apart from the stories
// so each file exports components only (fast refresh), or data only.
import { useState } from 'react'
import {
  Checkbox,
  Chip,
  DateInput,
  HUES,
  NumberField,
  NumberInput,
  Select,
  Stack,
  Swatch,
  TextInput,
  type Hue,
} from '@scoreboards/design-system'

const GAMES = [
  { value: 'skyjo', label: 'Skyjo' },
  { value: 'tarot', label: 'Tarot' },
  { value: 'flip7', label: 'Flip 7' },
]

export function TextInputDemo({ invalid = false }: { invalid?: boolean }) {
  const [value, setValue] = useState(invalid ? 'Alice' : '')
  return (
    <TextInput
      label="Nom du joueur"
      value={value}
      onChange={setValue}
      placeholder="Ex. Chloé"
      error={invalid ? 'Ce nom est déjà pris.' : undefined}
      hint={invalid ? undefined : 'Visible dans l’historique et les stats.'}
    />
  )
}

export function DateInputDemo({ layout }: { layout: 'stacked' | 'inline' }) {
  const [value, setValue] = useState('2026-11-06')
  return <DateInput label="Date de la partie" value={value} onChange={setValue} layout={layout} />
}

export function NumberInputDemo({ mode }: { mode: 'stepper' | 'plain' | 'cell' }) {
  const [value, setValue] = useState(12)
  return (
    <NumberInput
      label={mode === 'cell' ? undefined : 'Points'}
      ariaLabel="Points"
      value={value}
      onChange={setValue}
      mode={mode}
      decreaseLabel="Diminuer"
      increaseLabel="Augmenter"
    />
  )
}

export function NumberFieldDemo({ invalid = false }: { invalid?: boolean }) {
  const [value, setValue] = useState(invalid ? '-' : '42')
  return (
    <NumberField
      ariaLabel="Score de la manche"
      value={value}
      onChange={setValue}
      invalid={invalid}
    />
  )
}

export function SelectDemo({ size }: { size: 'sm' | 'md' }) {
  const [value, setValue] = useState('skyjo')
  return (
    <Select
      label={size === 'md' ? 'Jeu' : undefined}
      ariaLabel="Jeu"
      size={size}
      value={value}
      onChange={setValue}
      options={GAMES}
    />
  )
}

export function CheckboxDemo() {
  const [checked, setChecked] = useState(true)
  return (
    <Checkbox checked={checked} onChange={setChecked}>
      Bruno a joué cette partie
    </Checkbox>
  )
}

export function ChipDemo() {
  const [selected, setSelected] = useState('fr')
  return (
    <Stack direction="row" gap={2}>
      {[
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'English' },
      ].map((option) => (
        <Chip
          key={option.value}
          selected={selected === option.value}
          onClick={() => setSelected(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </Stack>
  )
}

export function SwatchDemo() {
  const [selected, setSelected] = useState<Hue>('mauve')
  return (
    <Stack direction="row" gap={0} wrap>
      {HUES.map((hue) => (
        <Swatch
          key={hue}
          hue={hue}
          label={hue}
          selected={selected === hue}
          onClick={() => setSelected(hue)}
        />
      ))}
    </Stack>
  )
}
