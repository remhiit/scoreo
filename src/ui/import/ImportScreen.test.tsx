import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImportMatchesUseCase } from '../../application/importMatchesUseCase'
import { invalidJson, validJson, withMultipleFailedDetailsJson } from '../../application/testImportData'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { ImportScreen } from './ImportScreen'

function buildUseCase() {
  return new ImportMatchesUseCase(
    new InMemoryPlayerRepository(),
    new InMemoryGameTypeRepository(),
    new InMemoryMatchRepository(),
    () => 1767225600000,
  )
}

function selectFile(content: string, name = 'import.json') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([content], name, { type: 'application/json' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ImportScreen', () => {
  it('shows the drop zone in the IDLE step', () => {
    render(<ImportScreen importUseCase={buildUseCase()} onDone={() => {}} />)
    expect(screen.getByText('Select a JSON file to import')).toBeInTheDocument()
  })

  it('selecting a valid file shows the preview and lets the user import', async () => {
    render(<ImportScreen importUseCase={buildUseCase()} onDone={() => {}} />)

    selectFile(validJson)

    expect(await screen.findByText('Import')).toBeInTheDocument()
    expect(screen.getByText('Game:')).toBeInTheDocument()
    expect(screen.getByText('Matches to import:')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Import'))

    expect(await screen.findByText(/imported/)).toBeInTheDocument()
  })

  it('selecting an invalid file shows an error and stays on the drop zone', async () => {
    render(<ImportScreen importUseCase={buildUseCase()} onDone={() => {}} />)

    selectFile(invalidJson)

    expect(await screen.findByText(/^Invalid file:/)).toBeInTheDocument()
    expect(screen.getByText('Select a JSON file to import')).toBeInTheDocument()
  })

  it('shows failed ids as siblings of the error line, not nested inside it', async () => {
    render(<ImportScreen importUseCase={buildUseCase()} onDone={() => {}} />)

    selectFile(withMultipleFailedDetailsJson)
    fireEvent.click(await screen.findByText('Import'))

    expect(await screen.findByText('3 failed')).toBeInTheDocument()
    const errorLine = screen.getByText('3 failed').closest('.import-result-line')
    expect(errorLine?.querySelector('.import-failed-id')).toBeNull()

    for (const id of ['m1', 'm2', 'm3']) {
      const idEl = screen.getByText(id)
      expect(idEl).toHaveClass('import-failed-id')
      expect(idEl.parentElement).not.toBe(errorLine)
    }
  })

  it('calls onDone and resets after Done is clicked', async () => {
    const onDone = vi.fn()
    render(<ImportScreen importUseCase={buildUseCase()} onDone={onDone} />)

    selectFile(validJson)
    fireEvent.click(await screen.findByText('Import'))
    fireEvent.click(await screen.findByText('Done'))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Select a JSON file to import')).toBeInTheDocument()
  })
})
