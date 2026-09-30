import { Chip } from '../atoms/Chip'
import { Swatch } from '../atoms/Swatch'
import type { Hue } from '../atoms/hues'
import { Text } from '../atoms/Text'

export interface ThemePickerProps<F extends string> {
  flavors: { value: F; label: string }[]
  flavor: F
  onFlavorChange: (flavor: F) => void
  accents: { value: Hue; label: string }[]
  accent: Hue
  onAccentChange: (accent: Hue) => void
  flavorLabel: string
  accentLabel: string
}

/** 4 flavors × 14 accents from one place — the proof nothing is hard-coded. */
export function ThemePicker<F extends string>({
  flavors,
  flavor,
  onFlavorChange,
  accents,
  accent,
  onAccentChange,
  flavorLabel,
  accentLabel,
}: ThemePickerProps<F>) {
  return (
    <div className="sc-theme-picker">
      <div className="sc-theme-picker__group" role="group" aria-label={flavorLabel}>
        <Text variant="label">{flavorLabel}</Text>
        <div className="sc-theme-picker__row">
          {flavors.map((option) => (
            <Chip
              key={option.value}
              selected={option.value === flavor}
              onClick={() => onFlavorChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="sc-theme-picker__group" role="group" aria-label={accentLabel}>
        <Text variant="label">{accentLabel}</Text>
        <div className="sc-theme-picker__row sc-theme-picker__row--tight">
          {accents.map((option) => (
            <Swatch
              key={option.value}
              hue={option.value}
              label={option.label}
              selected={option.value === accent}
              onClick={() => onAccentChange(option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
