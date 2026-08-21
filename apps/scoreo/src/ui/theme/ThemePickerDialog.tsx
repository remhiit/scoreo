import { LudoButton } from '../shared/LudoButton'
import { LudoModal } from '../shared/LudoModal'
import { ACCENTS, FLAVORS } from './themeManager'
import { useTheme } from './useTheme'

export interface ThemePickerDialogProps {
  onClose: () => void
}

/** Flavor + accent picker, opened from the burger menu. */
export function ThemePickerDialog({ onClose }: ThemePickerDialogProps) {
  const { flavor, accent, setFlavor, setAccent } = useTheme()

  return (
    <LudoModal
      open
      title="Theme"
      onClose={onClose}
      footer={<LudoButton text="Close" variant="secondary" onClick={onClose} />}
    >
      <div className="theme-picker-label">Flavor</div>
      <div className="theme-picker-row">
        {FLAVORS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === flavor ? 'theme-chip theme-chip--active' : 'theme-chip'}
            onClick={() => setFlavor(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="theme-picker-label">Accent</div>
      <div className="theme-picker-row">
        {ACCENTS.map((a) => (
          <button
            key={a}
            type="button"
            className={a === accent ? 'accent-swatch accent-swatch--active' : 'accent-swatch'}
            style={{ background: `var(--ctp-${a})` }}
            aria-label={a}
            onClick={() => setAccent(a)}
          />
        ))}
      </div>
    </LudoModal>
  )
}
