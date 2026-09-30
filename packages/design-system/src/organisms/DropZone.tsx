import type { ChangeEvent } from 'react'
import { Icon } from '../atoms/Icon'

export interface DropZoneProps {
  label: string
  /** `accept` attribute of the file input, e.g. `.json,application/json`. */
  accept?: string
  onFile: (file: File) => void
}

/** Dashed target, clickable as much as droppable; hands the chosen file back. */
export function DropZone({ label, accept, onFile }: DropZoneProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    // Choosing the same file again must still fire.
    e.target.value = ''
  }
  return (
    <label className="sc-drop">
      <Icon name="upload" size="lg" tone="accent" />
      <span className="sc-drop__label">{label}</span>
      <input className="sc-drop__input" type="file" accept={accept} onChange={handleChange} />
    </label>
  )
}
