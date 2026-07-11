import type { ImportMatchesUseCase, ImportPreview, ImportResult } from '../../application/importMatchesUseCase'
import { initialImportState, type ImportState } from './importTypes'

export type ImportAction =
  | { type: 'previewReady'; preview: ImportPreview; jsonContent: string }
  | { type: 'previewFailed'; error: string }
  | { type: 'importSucceeded'; result: ImportResult }
  | { type: 'importFailed'; error: string }
  | { type: 'fileError'; message: string }
  | { type: 'reset' }

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'previewReady':
      return { ...state, step: 'READY', preview: action.preview, jsonContent: action.jsonContent, error: undefined }
    case 'previewFailed':
      return { ...state, step: 'IDLE', preview: undefined, jsonContent: '', error: `Invalid file: ${action.error}` }
    case 'importSucceeded':
      return { ...state, step: 'DONE', result: action.result }
    case 'importFailed':
      return { ...state, step: 'IDLE', error: `Import failed: ${action.error}` }
    case 'fileError':
      return { ...state, step: 'IDLE', error: action.message, preview: undefined, jsonContent: '' }
    case 'reset':
      return initialImportState
  }
}

/** Mirrors ImportHandler's FileLoaded: previews the file and reports success/failure. */
export function submitFileLoaded(importUseCase: ImportMatchesUseCase, content: string): ImportAction {
  const result = importUseCase.preview(content)
  return result.ok
    ? { type: 'previewReady', preview: result.value, jsonContent: content }
    : { type: 'previewFailed', error: result.error.message }
}

/** Mirrors ImportHandler's Execute (only meaningful from the READY step — callers must guard). */
export function submitExecute(importUseCase: ImportMatchesUseCase, jsonContent: string): ImportAction {
  const result = importUseCase.execute(jsonContent)
  return result.ok
    ? { type: 'importSucceeded', result: result.value }
    : { type: 'importFailed', error: result.error.message }
}
