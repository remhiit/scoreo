export interface MeterProps {
  /** 0..1, clamped. */
  value: number
  /** Accessible name, e.g. "Win rate". */
  label: string
}

/** Win-rate bar: an accent fill on a sunken track, full width of its slot. */
export function Meter({ value, label }: MeterProps) {
  const ratio = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
  const percent = Math.round(ratio * 100)
  return (
    <span
      className="sc-meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span className="sc-meter__fill" style={{ width: `${percent}%` }} />
    </span>
  )
}
