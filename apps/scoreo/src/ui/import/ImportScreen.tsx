import { AlertTriangle, CheckCircle2, Upload, XCircle } from 'lucide-react'
import { useReducer, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImportMatchesUseCase } from '../../application/importMatchesUseCase'
import { LudoButton } from '../shared/LudoButton'
import { importReducer, submitExecute, submitFileLoaded } from './importReducer'
import { initialImportState } from './importTypes'

export interface ImportScreenProps {
  importUseCase: ImportMatchesUseCase
  onDone: () => void
}

export function ImportScreen({ importUseCase, onDone }: ImportScreenProps) {
  const { t } = useTranslation()
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
    reader.onerror = () => dispatch({ type: 'fileError', message: t('import.failedToReadFile') })
    reader.onabort = () => dispatch({ type: 'fileError', message: t('import.fileReadAborted') })
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
          <span className="import-zone-icon">
            <Upload size={24} aria-hidden />
          </span>
          <span className="import-zone-text">{t('import.selectFile')}</span>
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
            <span className="import-preview-label">{t('import.game')}</span>
            <span className="import-preview-value">{state.preview.gameName}</span>
          </div>
          <div className="import-preview-row">
            <span className="import-preview-label">{t('import.matchesToImport')}</span>
            <span className="import-preview-value">{state.preview.count}</span>
          </div>
        </div>
        <LudoButton text={t('import.importButton')} variant="primary" className="ludo-btn--full" onClick={handleExecute} />
      </>
    )
  }

  if (!state.result) return null
  return (
    <>
      <div className="import-result">
        <div className="import-result-line import-success">
          <CheckCircle2 size={18} aria-hidden /> {t('import.imported', { count: state.result.imported })}
        </div>
        {state.result.skipped.length > 0 && (
          <div className="import-result-line import-warn">
            <AlertTriangle size={18} aria-hidden /> {t('import.skipped', { count: state.result.skipped.length })}
          </div>
        )}
        {state.result.failed.length > 0 && (
          <>
            <div className="import-result-line import-error">
              <XCircle size={18} aria-hidden /> {t('import.failed', { count: state.result.failed.length })}
            </div>
            {state.result.failed.map((id) => (
              <div key={id} className="import-failed-id">
                {id}
              </div>
            ))}
          </>
        )}
      </div>
      <LudoButton text={t('import.done')} variant="primary" className="ludo-btn--full" onClick={handleDone} />
    </>
  )
}
