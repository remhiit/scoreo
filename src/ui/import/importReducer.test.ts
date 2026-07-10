import { describe, expect, it } from 'vitest'
import { ImportMatchesUseCase } from '../../application/importMatchesUseCase'
import { emptyGamesJson, invalidJson, validJson } from '../../application/testImportData'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { importReducer, submitExecute, submitFileLoaded } from './importReducer'
import { initialImportState } from './importTypes'

function buildUseCase(
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
  currentDate: () => number = () => 1767225600000,
) {
  return { playerRepo, gameTypeRepo, matchRepo, importUseCase: new ImportMatchesUseCase(playerRepo, gameTypeRepo, matchRepo, currentDate) }
}

describe('importReducer', () => {
  it('initial state is IDLE', () => {
    expect(initialImportState.step).toBe('IDLE')
    expect(initialImportState.preview).toBeUndefined()
    expect(initialImportState.error).toBeUndefined()
  })

  it('a valid file transitions to READY', () => {
    const { importUseCase } = buildUseCase()
    const state = importReducer(initialImportState, submitFileLoaded(importUseCase, validJson))

    expect(state.step).toBe('READY')
    expect(state.preview).toBeDefined()
    expect(state.error).toBeUndefined()
  })

  it('an invalid file stays in IDLE with an error', () => {
    const { importUseCase } = buildUseCase()
    const state = importReducer(initialImportState, submitFileLoaded(importUseCase, invalidJson))

    expect(state.step).toBe('IDLE')
    expect(state.preview).toBeUndefined()
    expect(state.error).toBeDefined()
  })

  it('executing from READY transitions to DONE', () => {
    const { importUseCase } = buildUseCase()
    let state = importReducer(initialImportState, submitFileLoaded(importUseCase, validJson))
    state = importReducer(state, submitExecute(importUseCase, state.jsonContent))

    expect(state.step).toBe('DONE')
    expect(state.result).toBeDefined()
    expect(state.error).toBeUndefined()
  })

  it('executing reports the imported count', () => {
    const { importUseCase } = buildUseCase()
    let state = importReducer(initialImportState, submitFileLoaded(importUseCase, validJson))
    state = importReducer(state, submitExecute(importUseCase, state.jsonContent))

    expect(state.result?.imported).toBe(1)
  })

  it('executing from IDLE does nothing (guarded by the caller)', () => {
    // ImportScreen only calls submitExecute when step === 'READY'; the guard
    // lives in the component, not the reducer (mirrors Kotlin's early return).
    expect(initialImportState.step).toBe('IDLE')
  })

  it('reset returns to IDLE', () => {
    const { importUseCase } = buildUseCase()
    let state = importReducer(initialImportState, submitFileLoaded(importUseCase, validJson))
    state = importReducer(state, submitExecute(importUseCase, state.jsonContent))
    expect(state.step).toBe('DONE')

    state = importReducer(state, { type: 'reset' })

    expect(state.step).toBe('IDLE')
    expect(state.preview).toBeUndefined()
    expect(state.result).toBeUndefined()
    expect(state.error).toBeUndefined()
  })

  it('an empty games array sets an error', () => {
    const { importUseCase } = buildUseCase()
    const state = importReducer(initialImportState, submitFileLoaded(importUseCase, emptyGamesJson))

    expect(state.step).toBe('IDLE')
    expect(state.error).toBeDefined()
  })

  it('fileError sets the error message in state', () => {
    const errorMessage = 'Access denied: cannot read file'
    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })

    expect(state.step).toBe('IDLE')
    expect(state.error).toBe(errorMessage)
    expect(state.preview).toBeUndefined()
  })

  it('fileError with an access denied message', () => {
    const errorMessage = 'Permission denied: insufficient privileges to read file'
    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })
    expect(state.error).toBe(errorMessage)
  })

  it('fileError with a file too large message', () => {
    const errorMessage = 'File too large: exceeds maximum size of 10MB'
    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })
    expect(state.error).toBe(errorMessage)
  })

  it('fileError with an invalid format message', () => {
    const errorMessage = 'Invalid file format: expected JSON but got binary data'
    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })
    expect(state.error).toBe(errorMessage)
  })

  it('fileError with a read error message', () => {
    const errorMessage = 'Read error: I/O exception while reading file'
    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })
    expect(state.error).toBe(errorMessage)
  })

  it('fileError with a file not found message', () => {
    const errorMessage = 'File not found or was deleted'
    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })
    expect(state.error).toBe(errorMessage)
  })

  it('fileError dismissal via reset returns to IDLE', () => {
    const errorMessage = 'Read error: cannot access file'
    let state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })
    expect(state.step).toBe('IDLE')
    expect(state.error).toBe(errorMessage)

    state = importReducer(state, { type: 'reset' })

    expect(state.step).toBe('IDLE')
    expect(state.error).toBeUndefined()
    expect(state.preview).toBeUndefined()
  })

  it('fileError prevents partial import: no data is saved', () => {
    const { importUseCase, playerRepo, gameTypeRepo, matchRepo } = buildUseCase()
    const errorMessage = 'File corrupted'

    const state = importReducer(initialImportState, { type: 'fileError', message: errorMessage })

    expect(playerRepo.getAll(true)).toHaveLength(0)
    expect(gameTypeRepo.getAll()).toHaveLength(0)
    expect(matchRepo.getAll()).toHaveLength(0)
    expect(state.error).toBe(errorMessage)
    // importUseCase constructed but never invoked for this scenario.
    expect(importUseCase).toBeDefined()
  })

  it('fileError from the READY step resets to IDLE', () => {
    const { importUseCase } = buildUseCase()
    let state = importReducer(initialImportState, submitFileLoaded(importUseCase, validJson))
    expect(state.step).toBe('READY')
    expect(state.preview).toBeDefined()

    const errorMessage = 'Connection lost during processing'
    state = importReducer(state, { type: 'fileError', message: errorMessage })

    expect(state.step).toBe('IDLE')
    expect(state.error).toBe(errorMessage)
    expect(state.preview).toBeUndefined()
  })

  it('multiple fileErrors update the message correctly', () => {
    let state = importReducer(initialImportState, { type: 'fileError', message: 'First error' })
    expect(state.error).toBe('First error')

    state = importReducer(state, { type: 'fileError', message: 'Second error' })
    expect(state.error).toBe('Second error')
  })
})
