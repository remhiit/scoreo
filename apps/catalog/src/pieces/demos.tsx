import { useState } from 'react'
import { Stack } from '@scoreboards/design-system'
import { DieCounter } from '../../../../packages/module-mille-sabords/src/design'
import { VariantPicker } from '../../../../packages/module-tori-valley/src/design'

const FACES = [
  { face: '💀', label: 'Crâne', count: 1 },
  { face: '💎', label: 'Diamant', count: 3 },
  { face: '🪙', label: 'Or', count: 0 },
  { face: '🐒', label: 'Singe', count: 4 },
]

/** The dice being sorted: tap a face up or down, the count follows. */
export function DieCounterDemo() {
  const [counts, setCounts] = useState(FACES.map((face) => face.count))
  const change = (index: number, delta: number) =>
    setCounts((current) =>
      current.map((count, i) => (i === index ? Math.min(8, Math.max(0, count + delta)) : count)),
    )
  return (
    <Stack gap={1}>
      {FACES.map((face, index) => (
        <DieCounter
          key={face.label}
          face={face.face}
          label={face.label}
          count={counts[index]}
          onDecrease={() => change(index, -1)}
          onIncrease={() => change(index, 1)}
        />
      ))}
    </Stack>
  )
}

const VARIANTS = ['A', 'B', 'C'] as const

/** One Objectif card per landscape, each on its own variant. */
export function VariantPickerDemo() {
  const [bamboo, setBamboo] = useState<(typeof VARIANTS)[number]>('A')
  const [water, setWater] = useState<(typeof VARIANTS)[number]>('C')
  return (
    <Stack gap={2}>
      <VariantPicker
        name="catalog-variant-bamboo"
        variants={VARIANTS}
        value={bamboo}
        onChange={setBamboo}
        ariaLabel={(variant) => `Bambou variante ${variant}`}
      />
      <VariantPicker
        name="catalog-variant-water"
        variants={VARIANTS}
        value={water}
        onChange={setWater}
        ariaLabel={(variant) => `Eau variante ${variant}`}
      />
    </Stack>
  )
}
