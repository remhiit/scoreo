import type { ReactNode } from 'react'
import { cx } from '../cx'

export interface ChoiceOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  options: ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** Switches between views of one screen (standings / history). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className="sc-seg" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx('sc-seg__option', option.value === value && 'sc-seg__option--on')}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export interface TabsProps<T extends string> {
  options: ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** Filters a list by category (e.g. by game), underlined in the accent. */
export function Tabs<T extends string>({ options, value, onChange, ariaLabel }: TabsProps<T>) {
  return (
    <div className="sc-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          className={cx('sc-tabs__tab', option.value === value && 'sc-tabs__tab--on')}
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export interface TabPanelProps {
  /** Accessible name — usually the label of the tab that shows it. */
  ariaLabel: string
  children: ReactNode
}

/** The content a `<Tabs>` choice shows, on a card under the tabs. */
export function TabPanel({ ariaLabel, children }: TabPanelProps) {
  return (
    <div className="sc-tabpanel" role="tabpanel" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
