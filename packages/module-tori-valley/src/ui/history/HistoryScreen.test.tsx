import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import { ExportMatchesUseCase } from '../../application/exportMatchesUseCase'
import { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { defaultObjectifCardSelection } from '../../domain/model/landscape'
import { emptyPlayerResult } from '../../domain/model/match'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { HistoryScreen } from './HistoryScreen'

function soloMatch(id: string, playedAt: number) {
  return {
    id,
    playedAt,
    playerIds: ['p1'],
    objectifCards: defaultObjectifCardSelection(),
    results: [emptyPlayerResult('p1')],
  }
}

function setup(options: { withSoloMatch?: boolean; soloOnly?: boolean } = {}) {
  const playerRepo = new InMemoryPlayerRepository()
  playerRepo.save({ id: 'p1', name: 'Alice', active: true })
  playerRepo.save({ id: 'p2', name: 'Bob', active: true })
  const matchRepo = new InMemoryMatchRepository()
  if (options.soloOnly) {
    matchRepo.save(soloMatch('m1', 1000))
    return renderScreen(matchRepo, playerRepo)
  }
  matchRepo.save({
    id: 'm1',
    playedAt: 1000,
    playerIds: ['p1', 'p2'],
    objectifCards: defaultObjectifCardSelection(),
    results: [
      { ...emptyPlayerResult('p1'), parcheminValue: 5 },
      { ...emptyPlayerResult('p2'), parcheminValue: 3 },
    ],
  })
  if (options.withSoloMatch) matchRepo.save(soloMatch('m2', 2000))
  return renderScreen(matchRepo, playerRepo)
}

function renderScreen(matchRepo: InMemoryMatchRepository, playerRepo: InMemoryPlayerRepository) {
  const onEditMatch = vi.fn()

  render(
    <HistoryScreen
      getMatches={new GetMatchesUseCase(matchRepo)}
      getPlayers={new GetPlayersUseCase(playerRepo)}
      deleteMatch={new DeleteMatchUseCase(matchRepo)}
      exportMatches={new ExportMatchesUseCase(matchRepo, playerRepo, () => 1_700_000_000_000)}
      onEditMatch={onEditMatch}
    />,
  )

  return { matchRepo, onEditMatch }
}

function stubDownload() {
  const downloaded: { filename: string; json: string }[] = []
  class FakeBlob {
    constructor(readonly parts: string[]) {}
  }
  vi.stubGlobal('Blob', FakeBlob)
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: FakeBlob) => `blob:${blob.parts[0]}`,
    revokeObjectURL: () => {},
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloaded.push({ filename: this.download, json: this.href.replace(/^blob:/, '') })
  })
  return downloaded
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('HistoryScreen', () => {
  it('shows an empty state when there are no matches', () => {
    render(
      <HistoryScreen
        getMatches={new GetMatchesUseCase(new InMemoryMatchRepository())}
        getPlayers={new GetPlayersUseCase(new InMemoryPlayerRepository())}
        deleteMatch={new DeleteMatchUseCase(new InMemoryMatchRepository())}
        exportMatches={
          new ExportMatchesUseCase(
            new InMemoryMatchRepository(),
            new InMemoryPlayerRepository(),
            () => 0,
          )
        }
        onEditMatch={vi.fn()}
      />,
    )
    expect(screen.getByText('No matches recorded yet.')).toBeInTheDocument()
  })

  it('lists each player with their score and marks the winner', () => {
    setup()
    expect(screen.getByText('Alice 🏆')).toBeInTheDocument()
    expect(screen.getByText('5 VP')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('3 VP')).toBeInTheDocument()
  })

  it('calls onEditMatch with the match id and player ids', () => {
    const { onEditMatch } = setup()
    fireEvent.click(screen.getByText('Edit'))
    expect(onEditMatch).toHaveBeenCalledWith('m1', ['p1', 'p2'])
  })

  it('downloads a Scoreo import file', () => {
    const downloaded = stubDownload()
    setup()

    fireEvent.click(screen.getByText('Export for Scoreo'))

    expect(downloaded).toHaveLength(1)
    expect(downloaded[0].filename).toBe(
      `tori-valley-scoreo-${new Date(1_700_000_000_000).toLocaleDateString('sv-SE')}.json`,
    )
    const payload = JSON.parse(downloaded[0].json)
    expect(payload.version).toBe('1.1')
    expect(payload.games.map((g: { id: string }) => g.id)).toEqual(['m1'])
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('warns that solo matches were left out of the export', () => {
    stubDownload()
    setup({ withSoloMatch: true })

    fireEvent.click(screen.getByText('Export for Scoreo'))

    expect(screen.getByRole('status')).toHaveTextContent(
      '1 solo match left out — Scoreo needs at least 2 players per match.',
    )
  })

  it('offers no file when every recorded match is solo', () => {
    const downloaded = stubDownload()
    setup({ soloOnly: true })

    fireEvent.click(screen.getByText('Export for Scoreo'))

    expect(downloaded).toEqual([])
    expect(screen.getByRole('status')).toHaveTextContent(
      'Nothing to export — Scoreo needs at least 2 players per match, and every recorded match is solo.',
    )
  })

  it('deletes a match', () => {
    const { matchRepo } = setup()
    fireEvent.click(screen.getByLabelText('Delete match'))
    expect(matchRepo.getAll()).toHaveLength(0)
    expect(screen.getByText('No matches recorded yet.')).toBeInTheDocument()
  })
})
