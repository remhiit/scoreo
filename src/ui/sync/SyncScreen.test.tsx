import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncUseCase } from '../../application/syncUseCase'
import { InMemoryDataChangeNotifier } from '../../infrastructure/events/inMemoryDataChangeNotifier'
import { InMemoryCloudSyncRepository } from '../../infrastructure/testing/inMemoryCloudSyncRepository'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { SyncScreen } from './SyncScreen'

function buildUseCase(cloudRepo = new InMemoryCloudSyncRepository(), playerRepo = new InMemoryPlayerRepository()) {
  return {
    cloudRepo,
    syncUseCase: new SyncUseCase(
      cloudRepo,
      playerRepo,
      new InMemoryGameTypeRepository(),
      new InMemoryMatchRepository(),
      new InMemoryDataChangeNotifier(),
    ),
  }
}

describe('SyncScreen', () => {
  beforeEach(() => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the disconnected view and connects on click', async () => {
    const { syncUseCase } = buildUseCase()
    render(<SyncScreen syncUseCase={syncUseCase} />)

    expect(await screen.findByText('Cloud Sync')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('Connect with Google'))
    })

    expect(await screen.findByText('Sync complete')).toBeInTheDocument()
  })

  it('shows the conflict view with both snapshots and resolves by keeping local', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    cloudRepo.storedData = {
      players: [{ id: 'p2', name: 'Bob', active: true }],
      gameTypes: [],
      matches: [],
      lastModified: 1000,
    }
    const { syncUseCase } = buildUseCase(cloudRepo, playerRepo)
    render(<SyncScreen syncUseCase={syncUseCase} />)

    await screen.findByText('Connect with Google')
    await act(async () => {
      fireEvent.click(screen.getByText('Connect with Google'))
    })

    expect(await screen.findByText('Sync conflict')).toBeInTheDocument()
    expect(screen.getAllByText('1 players', { exact: false })).toHaveLength(2)

    await act(async () => {
      fireEvent.click(screen.getByText('Keep local'))
    })

    expect(await screen.findByText('Sync complete')).toBeInTheDocument()
  })

  it('shows an offline banner when navigator.onLine is false', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const { syncUseCase } = buildUseCase()
    render(<SyncScreen syncUseCase={syncUseCase} />)

    expect(await screen.findByText(/Offline/)).toBeInTheDocument()
  })

  it('shows the error and dismisses it', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    cloudRepo.failNext = () => ({ kind: 'ApiError', code: 0, message: 'Network timeout' })
    const { syncUseCase } = buildUseCase(cloudRepo)
    render(<SyncScreen syncUseCase={syncUseCase} />)

    await screen.findByText('Connect with Google')
    await act(async () => {
      fireEvent.click(screen.getByText('Connect with Google'))
    })

    expect(await screen.findByText('Network timeout')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Dismiss'))

    expect(screen.queryByText('Network timeout')).not.toBeInTheDocument()
  })

  it('restores an already-connected session on mount', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    cloudRepo.connected = true
    const { syncUseCase } = buildUseCase(cloudRepo)
    render(<SyncScreen syncUseCase={syncUseCase} />)

    expect(await screen.findByText('Sync complete')).toBeInTheDocument()
  })

  it('shows a Disconnect button when auto-sync fails after a successful login', async () => {
    const cloudRepo = new InMemoryCloudSyncRepository()
    cloudRepo.connected = true
    cloudRepo.failNext = () => ({ kind: 'ApiError', code: 0, message: 'Network timeout' })
    const { syncUseCase } = buildUseCase(cloudRepo)
    render(<SyncScreen syncUseCase={syncUseCase} />)

    expect(await screen.findByText('Network timeout')).toBeInTheDocument()
    expect(screen.getByText('Cloud Sync')).toBeInTheDocument()
    expect(screen.queryByText('Connect with Google')).not.toBeInTheDocument()
    expect(screen.getByText('Disconnect')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('Disconnect'))
    })

    expect(await screen.findByText('Connect with Google')).toBeInTheDocument()
  })

  it('shows the Connect button when never connected', async () => {
    const { syncUseCase } = buildUseCase()
    render(<SyncScreen syncUseCase={syncUseCase} />)

    expect(await screen.findByText('Connect with Google')).toBeInTheDocument()
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument()
  })

  it('shows a Restoring view immediately on mount, never the Connect button first', () => {
    const { syncUseCase } = buildUseCase()
    render(<SyncScreen syncUseCase={syncUseCase} />)

    expect(screen.getByText('Restoring session...')).toBeInTheDocument()
    expect(screen.queryByText('Connect with Google')).not.toBeInTheDocument()
  })
})
