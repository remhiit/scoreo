import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import i18n from '../../i18n/i18n'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { HistoryScreen, type HistoryScreenProps } from './HistoryScreen'

function player(id: string, name: string): Player {
  return { id, name, active: true }
}

function gameType(id: string, name: string): GameType {
  return {
    id,
    name,
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
  }
}

function match(
  id: string,
  date: number,
  gameTypeId: string,
  playerScores: Match['playerScores'],
  rounds: Match['rounds'] = [],
  moduleData: Match['moduleData'] = null,
): Match {
  return {
    id,
    date,
    gameTypeId,
    playerScores,
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds,
    moduleData,
  }
}

/** Chess (m1) is the most recent match, so it sorts first in the list. */
function renderHistory(onEditMatch?: HistoryScreenProps['onEditMatch']) {
  const playerRepo = new InMemoryPlayerRepository()
  playerRepo.save(player('p1', 'Alice'))
  playerRepo.save(player('p2', 'Bob'))
  const gameTypeRepo = new InMemoryGameTypeRepository()
  gameTypeRepo.save(gameType('gt1', 'Chess'))
  gameTypeRepo.save(gameType('gt2', 'Darts'))
  const matchRepo = new InMemoryMatchRepository()
  matchRepo.save(match(
    'm1',
    2000,
    'gt1',
    [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ],
    [
      [
        { playerId: 'p1', score: 6 },
        { playerId: 'p2', score: 2 },
      ],
      [
        { playerId: 'p1', score: 4 },
        { playerId: 'p2', score: 3 },
      ],
    ],
  ))
  matchRepo.save(match('m2', 1000, 'gt2', [
    { playerId: 'p1', score: 3 },
    { playerId: 'p2', score: 10 },
  ]))

  return render(
    <HistoryScreen
      getMatches={new GetMatchesUseCase(matchRepo)}
      getPlayers={new GetPlayersUseCase(playerRepo)}
      getGameTypes={new GetGameTypesUseCase(gameTypeRepo)}
      deleteMatchUseCase={new DeleteMatchUseCase(matchRepo)}
      onEditMatch={onEditMatch}
    />,
  )
}

function itemName(name: string) {
  return screen.getByText(name, { selector: '.list-item-name' })
}

function queryItemName(name: string) {
  return screen.queryByText(name, { selector: '.list-item-name' })
}

describe('HistoryScreen', () => {
  it('shows the empty message when there are no matches', () => {
    render(
      <HistoryScreen
        getMatches={new GetMatchesUseCase(new InMemoryMatchRepository())}
        getPlayers={new GetPlayersUseCase(new InMemoryPlayerRepository())}
        getGameTypes={new GetGameTypesUseCase(new InMemoryGameTypeRepository())}
        deleteMatchUseCase={new DeleteMatchUseCase(new InMemoryMatchRepository())}
      />,
    )

    expect(screen.getByText('No matches yet.')).toBeInTheDocument()
  })

  it('renders matches with scores and lets the filter narrow the list', () => {
    renderHistory()

    expect(itemName('Chess')).toBeInTheDocument()
    expect(itemName('Darts')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gt1' } })

    expect(itemName('Chess')).toBeInTheDocument()
    expect(queryItemName('Darts')).not.toBeInTheDocument()
  })

  it('renders each match over three lines: name, scores with the winner in bold, then date', () => {
    renderHistory()

    const chessRow = itemName('Chess').closest('.list-item-row')
    expect(chessRow).not.toBeNull()

    const scoresLine = chessRow!.querySelector('.list-item-players')
    expect(scoresLine).toHaveTextContent('Alice 10 · Bob 5')
    expect(scoresLine!.querySelector('strong')).toHaveTextContent('Alice 10')

    const dateLine = chessRow!.querySelector('.list-item-date')
    expect(dateLine).toHaveTextContent(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(chessRow!.querySelector('.list-item-subtitle')).not.toBeInTheDocument()
  })

  it('shows the generic empty message once every match is deleted', () => {
    renderHistory()

    fireEvent.click(screen.getAllByLabelText('Delete')[0])
    fireEvent.click(screen.getByText('Delete', { selector: 'button' }))
    fireEvent.click(screen.getAllByLabelText('Delete')[0])
    fireEvent.click(screen.getByText('Delete', { selector: 'button' }))

    expect(screen.getByText('No matches yet.')).toBeInTheDocument()
  })

  it('delete flow: confirms via modal and removes the match', () => {
    renderHistory()

    const deleteButtons = screen.getAllByLabelText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(screen.getByText('Delete match?')).toBeInTheDocument()
    expect(screen.getByText('Match data will be lost.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Delete match?')).not.toBeInTheDocument()
    expect(itemName('Chess')).toBeInTheDocument()

    fireEvent.click(screen.getAllByLabelText('Delete')[0])
    fireEvent.click(screen.getByText('Delete', { selector: 'button' }))

    expect(screen.queryByText('Delete match?')).not.toBeInTheDocument()
    expect(queryItemName('Chess')).not.toBeInTheDocument()
    expect(itemName('Darts')).toBeInTheDocument()
  })

  it('calls onEditMatch with the match parameters when Edit is clicked', () => {
    const onEditMatch = vi.fn()
    renderHistory(onEditMatch)

    fireEvent.click(screen.getAllByLabelText('Edit')[0])

    expect(onEditMatch).toHaveBeenCalledWith('gt1', ['p1', 'p2'], 'm1', undefined)
  })

  it('passes the module id to onEditMatch when the match was scored on a module', () => {
    const onEditMatch = vi.fn()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Chess'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(
      match(
        'm1',
        2000,
        'gt1',
        [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
        ],
        [],
        { moduleId: 'tori-valley', version: 1, data: {} },
      ),
    )

    render(
      <HistoryScreen
        getMatches={new GetMatchesUseCase(matchRepo)}
        getPlayers={new GetPlayersUseCase(playerRepo)}
        getGameTypes={new GetGameTypesUseCase(gameTypeRepo)}
        deleteMatchUseCase={new DeleteMatchUseCase(matchRepo)}
        onEditMatch={onEditMatch}
      />,
    )

    fireEvent.click(screen.getAllByLabelText('Edit')[0])

    expect(onEditMatch).toHaveBeenCalledWith('gt1', ['p1', 'p2'], 'm1', 'tori-valley')
  })

  it('hides the Edit action when onEditMatch is not provided', () => {
    renderHistory()

    expect(screen.queryAllByTitle('Edit')).toHaveLength(0)
  })

  it('updates displayed labels immediately when the language changes', async () => {
    renderHistory()

    expect(screen.getByText('Filter by game:')).toBeInTheDocument()
    expect(screen.getByText('All games')).toBeInTheDocument()

    await i18n.changeLanguage('fr')

    expect(screen.getByText('Filtrer par jeu :')).toBeInTheDocument()
    expect(screen.getByText('Tous les jeux')).toBeInTheDocument()
    expect(screen.queryByText('Filter by game:')).not.toBeInTheDocument()

    await i18n.changeLanguage('en')
  })

  it('translates the delete confirmation modal', () => {
    renderHistory()

    fireEvent.click(screen.getAllByLabelText('Delete')[0])

    expect(screen.getByText('Delete match?')).toBeInTheDocument()
    expect(screen.getByText('Match data will be lost.')).toBeInTheDocument()
    expect(screen.getByText('Cancel', { selector: 'button' })).toBeInTheDocument()
  })

  it('view flow: shows every stored round of the match, then its totals', () => {
    renderHistory()

    fireEvent.click(screen.getAllByLabelText('View details')[0])

    expect(screen.getByText('Round detail')).toBeInTheDocument()
    const roundCards = document.querySelectorAll('.rounds-detail-round')
    expect(roundCards).toHaveLength(2)
    expect(roundCards[0]).toHaveTextContent('Round 1')
    expect(roundCards[0]).toHaveTextContent('Alice6')
    expect(roundCards[0]).toHaveTextContent('Bob2')
    expect(roundCards[1]).toHaveTextContent('Round 2')
    expect(roundCards[1]).toHaveTextContent('Alice4')
    expect(roundCards[1]).toHaveTextContent('Bob3')

    const totals = document.querySelector('.rounds-detail-totals')
    expect(totals).toHaveTextContent('Alice 10 · Bob 5')
    expect(totals!.querySelector('strong')).toHaveTextContent('Alice 10')
  })

  it('explains that a match stored without round detail has none to show', () => {
    renderHistory()

    fireEvent.click(screen.getAllByLabelText('View details')[1])

    expect(screen.getByText('No round detail was recorded for this match.')).toBeInTheDocument()
    expect(document.querySelectorAll('.rounds-detail-round')).toHaveLength(0)
    expect(document.querySelector('.rounds-detail-totals')).toHaveTextContent('Bob 10')
  })

  it('closes the round detail modal on Close', () => {
    renderHistory()

    fireEvent.click(screen.getAllByLabelText('View details')[0])
    fireEvent.click(screen.getByText('Close', { selector: 'button' }))

    expect(screen.queryByText('Round detail')).not.toBeInTheDocument()
  })

  it('translates the round detail modal', async () => {
    renderHistory()
    await i18n.changeLanguage('fr')

    fireEvent.click(screen.getAllByLabelText('View details')[0])

    expect(screen.getByText('Détail des manches')).toBeInTheDocument()
    expect(document.querySelector('.rounds-detail-round')).toHaveTextContent('Manche 1')

    await i18n.changeLanguage('en')
  })
})
