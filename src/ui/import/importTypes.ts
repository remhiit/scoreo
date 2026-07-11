import type { ImportPreview, ImportResult } from '../../application/importMatchesUseCase'

export type ImportStep = 'IDLE' | 'READY' | 'DONE'

export interface ImportState {
  step: ImportStep
  preview: ImportPreview | undefined
  jsonContent: string
  result: ImportResult | undefined
  error: string | undefined
}

export const initialImportState: ImportState = {
  step: 'IDLE',
  preview: undefined,
  jsonContent: '',
  result: undefined,
  error: undefined,
}
