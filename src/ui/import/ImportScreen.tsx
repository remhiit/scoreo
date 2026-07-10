import { useReducer, type ChangeEvent } from 'react'
import type { ImportMatchesUseCase } from '../../application/importMatchesUseCase'
import { LudoButton } from '../shared/LudoButton'
import { importReducer, submitExecute, submitFileLoaded } from './importReducer'
import { initialImportState } from './importTypes'

export interface ImportScreenProps {
  importUseCase: ImportMatchesUseCase
  onDone: () => void
}

export function ImportScreen({ importUseCase, onDone }: ImportScreenProps) {
  const [state, dispatch] = useReducer(importReducer, initialImportState)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        dispatch(submitFileLoaded(importUseCase, reader.result))
      }
    }
    reader.onerror = () => dispatch({ type: 'fileError', message: 'Failed to read file' })
    reader.onabort = () => dispatch({ type: 'fileError', message: 'File read was aborted' })
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExecute = () => {
    if (state.step !== 'READY') return
    dispatch(submitExecute(importUseCase, state.jsonContent))
  }

  const handleDone = () => {
    dispatch({ type: 'reset' })
    onDone()
  }

  if (state.step === 'IDLE') {
    return (
      <>
        <label className="import-zone">
          <span className="import-zone-icon">📥</span>
          <span className="import-zone-text">Select a JSON file to import</span>
          <input type="file" accept=".json,application/json" onChange={handleFileChange} />
        </label>
        {state.error && <div className="error-msg">{state.error}</div>}
      </>
    )
  }

  if (state.step === 'READY') {
    if (!state.preview) return null
    return (
      <>
        <div className="import-preview">
          <div className="import-preview-row">
            <span className="import-preview-label">Game:</span>
            <span className="import-preview-value">{state.preview.gameName}</span>
          </div>
          <div className="import-preview-row">
            <span className="import-preview-label">Matches to import:</span>
            <span className="import-preview-value">{state.preview.count}</span>
          </div>
        </div>
        <LudoButton text="Import" variant="primary" className="ludo-btn--full" onClick={handleExecute} />
      </>
    )
  }

  if (!state.result) return null
  return (
    <>
      <div className="import-result">
        <div className="import-result-line import-success">✅ {state.result.imported} imported</div>
        {state.result.skipped.length > 0 && (
          <div className="import-result-line import-warn">
            ⚠️ {state.result.skipped.length} skipped (duplicate IDs)
          </div>
        )}
        {state.result.failed.length > 0 && (
          <div className="import-result-line import-error">
            ❌ {state.result.failed.length} failed
            {state.result.failed.map((id) => (
              <div key={id} className="import-failed-id">
                {id}
              </div>
            ))}
          </div>
        )}
      </div>
      <LudoButton text="Done" variant="primary" className="ludo-btn--full" onClick={handleDone} />
    </>
  )
}
