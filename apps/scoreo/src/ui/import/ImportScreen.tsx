import {
  Button,
  DetailList,
  DetailRow,
  DropZone,
  Stack,
  StatusLine,
  Text,
} from '@scoreboards/design-system'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImportMatchesUseCase } from '../../application/importMatchesUseCase'
import { importReducer, submitExecute, submitFileLoaded } from './importReducer'
import { initialImportState } from './importTypes'

export interface ImportScreenProps {
  importUseCase: ImportMatchesUseCase
  onDone: () => void
}

export function ImportScreen({ importUseCase, onDone }: ImportScreenProps) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(importReducer, initialImportState)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        dispatch(submitFileLoaded(importUseCase, reader.result))
      }
    }
    reader.onerror = () => dispatch({ type: 'fileError', message: t('import.failedToReadFile') })
    reader.onabort = () => dispatch({ type: 'fileError', message: t('import.fileReadAborted') })
    reader.readAsText(file)
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
      <Stack gap={3}>
        <DropZone
          label={t('import.selectFile')}
          accept=".json,application/json"
          onFile={handleFile}
        />
        {state.error && <Text variant="error">{state.error}</Text>}
      </Stack>
    )
  }

  if (state.step === 'READY') {
    if (!state.preview) return null
    return (
      <Stack gap={4}>
        <DetailList boxed>
          <DetailRow label={t('import.game')} value={state.preview.gameName} />
          <DetailRow label={t('import.matchesToImport')} value={state.preview.count} />
        </DetailList>
        <Button width="full" onClick={handleExecute}>
          {t('import.importButton')}
        </Button>
      </Stack>
    )
  }

  if (!state.result) return null
  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <StatusLine tone="success">
          {t('import.imported', { count: state.result.imported })}
        </StatusLine>
        {state.result.skipped.length > 0 && (
          <StatusLine tone="warning">
            {t('import.skipped', { count: state.result.skipped.length })}
          </StatusLine>
        )}
        {state.result.failed.length > 0 && (
          <StatusLine tone="danger" details={state.result.failed}>
            {t('import.failed', { count: state.result.failed.length })}
          </StatusLine>
        )}
      </Stack>
      <Button width="full" onClick={handleDone}>
        {t('import.done')}
      </Button>
    </Stack>
  )
}
