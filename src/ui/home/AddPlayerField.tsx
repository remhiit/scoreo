import { LudoButton } from '../shared/LudoButton'
import { LudoTextInput } from '../shared/LudoTextInput'

export interface AddPlayerFieldProps {
  value: string
  onChange: (name: string) => void
  onSubmit: () => void
  error: string | undefined
}

export function AddPlayerField({ value, onChange, onSubmit, error }: AddPlayerFieldProps) {
  return (
    <>
      <div className="form-row">
        <LudoTextInput
          value={value}
          onChange={onChange}
          placeholder="Player name"
          invalid={error !== undefined}
          onEnter={onSubmit}
        />
        <LudoButton text="Add" variant="primary" onClick={onSubmit} />
      </div>

      {error && <div className="error-msg">{error}</div>}
    </>
  )
}
