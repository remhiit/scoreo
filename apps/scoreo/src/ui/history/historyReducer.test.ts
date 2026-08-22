import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { MatchRepository } from '../../domain/port/matchRepository'
import type { Player } from '../../domain/model/player'
import { DeleteMatchUseCase } from '../../application/deleteMatchUseCase'
import { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import { GetMatchesUseCase } from '../../application/getMatchesUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { buildRoundBreakdown, buildScoreSummary, deleteMatch, historyReducer, loadDisplays } from './historyReducer'
import type { MatchDisplay } from './historyTypes'
import { initialHistoryState } from './historyTypes'

function player(id: string, name: string, active = true): Player {
  return { id, name, active }
}

function gameType(
  id: string,
  name: string,
  winCondition: GameType['winCondition'] = 'HIGHEST_SCORE',
  tieBreakRule: GameType['tieBreakRule'] = 'NONE',
): GameType {
  return {
    id,
    name,
    winCondition,
    tieBreakRule,
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
  overrides: Partial<Match> = {},
): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null, ...overrides }
}

function buildUseCases(
  playerRepo = new InMemoryPlayerRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  matchRepo = new InMemoryMatchRepository(),
) {
  return {
    getMatches: new GetMatchesUseCase(matchRepo),
    getPlayers: new GetPlayersUseCase(playerRepo),
    getGameTypes: new GetGameTypesUseCase(gameTypeRepo),
    deleteMatchUseCase: new DeleteMatchUseCase(matchRepo),
  }
}

describe('historyReducer', () => {
  it('initial state has empty displays', () => {
    expect(initialHistoryState.displays).toEqual([])
  })

  it('loadDisplays populates state from repositories', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'TestGame'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const displays = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(displays).toHaveLength(1)
  })

  it('matches are sorted by date descending', () => {
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 3000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    matchRepo.save(match('m2', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    matchRepo.save(match('m3', 2000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, undefined, matchRepo)

    const displays = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(displays.map((d) => d.match.id)).toEqual(['m1', 'm3', 'm2'])
  })

  it('player names are resolved from the repository', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.players['p1']).toBeDefined()
    expect(display.players['p1'].name).toBe('Alice')
    expect(display.playerLabels['p1']).toBe('Alice')
  })

  it('unknown gameType is undefined', () => {
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'unknown_gt', [{ playerId: 'p1', score: 10 }]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, undefined, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.gameType).toBeUndefined()
  })

  it('winners are computed for HIGHEST_SCORE', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.winners).toEqual(['p1'])
  })

  it('date is formatted for a valid timestamp', () => {
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1767225600000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, undefined, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.dateFormatted).toBeTruthy()
  })

  it('playerLabels shows the deleted suffix for inactive players', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice', false))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(playerRepo, gameTypeRepo, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.playerLabels['p1']).toBe('Alice (deleted)')
  })

  it('playerLabels shows a generic label when the name is blank', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', '', false))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(playerRepo, undefined, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.playerLabels['p1']).toBe('Deleted player')
  })

  it('reloading reflects data changes', () => {
    const matchRepo = new InMemoryMatchRepository()
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, undefined, matchRepo)

    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    expect(loadDisplays(getMatches, getPlayers, getGameTypes)).toHaveLength(1)

    matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    expect(loadDisplays(getMatches, getPlayers, getGameTypes)).toHaveLength(2)
  })

  it('isTieBreakIndeterminate is true for MANUAL_SELECTION with no manualWinners', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE', 'MANUAL_SELECTION'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(
      match('m1', 1000, 'gt1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 10 },
      ]),
    )
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, gameTypeRepo, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.isTieBreakIndeterminate).toBe(true)
  })

  it('isTieBreakIndeterminate is false once the tie is resolved', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE', 'MANUAL_SELECTION'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(
      match(
        'm1',
        1000,
        'gt1',
        [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 10 },
        ],
        { manualWinners: ['p1'] },
      ),
    )
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, gameTypeRepo, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.isTieBreakIndeterminate).toBe(false)
  })

  it('isTieBreakIndeterminate is false when there is no tie', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE', 'MANUAL_SELECTION'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(
      match('m1', 1000, 'gt1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
    )
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, gameTypeRepo, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.isTieBreakIndeterminate).toBe(false)
  })

  it('showDeleteConfirm sets deleteConfirmMatchId', () => {
    const state = historyReducer(initialHistoryState, { type: 'showDeleteConfirm', matchId: 'match123' })
    expect(state.deleteConfirmMatchId).toBe('match123')
  })

  it('deleteMatch calls the use case', () => {
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const deleteMatchUseCase = new DeleteMatchUseCase(matchRepo)

    deleteMatch(deleteMatchUseCase, 'm1')

    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('deleting then reloading reflects the removed match', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 20 }]))
    const { getMatches, getPlayers, getGameTypes, deleteMatchUseCase } = buildUseCases(
      playerRepo,
      gameTypeRepo,
      matchRepo,
    )

    expect(loadDisplays(getMatches, getPlayers, getGameTypes)).toHaveLength(2)

    deleteMatch(deleteMatchUseCase, 'm1')
    const displays = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(displays).toHaveLength(1)
    expect(displays[0].match.id).toBe('m2')
  })

  it('a successful delete clears the confirm id via loaded', () => {
    let state = historyReducer(initialHistoryState, { type: 'showDeleteConfirm', matchId: 'm1' })
    expect(state.deleteConfirmMatchId).toBe('m1')

    state = historyReducer(state, { type: 'loaded', displays: [] })

    expect(state.deleteConfirmMatchId).toBeUndefined()
  })

  it('deleting a nonexistent match does not set an error', () => {
    const matchRepo = new InMemoryMatchRepository()
    const deleteMatchUseCase = new DeleteMatchUseCase(matchRepo)

    const error = deleteMatch(deleteMatchUseCase, 'nonexistent')

    expect(error).toBeUndefined()
  })

  it('a repository exception is turned into an error message', () => {
    const failingMatchRepo: MatchRepository = {
      getAll: () => [],
      save: () => {},
      saveAll: () => {},
      findById: () => undefined,
      delete: () => {
        throw new Error('Storage error: failed to delete match')
      },
      deleteAll: () => {},
    }
    const deleteMatchUseCase = new DeleteMatchUseCase(failingMatchRepo)

    const error = deleteMatch(deleteMatchUseCase, 'm1')

    expect(error).toBe('Failed to delete match: Storage error: failed to delete match')
  })

  it('dismissDeleteConfirm clears the id', () => {
    let state = historyReducer(initialHistoryState, { type: 'showDeleteConfirm', matchId: 'match123' })
    expect(state.deleteConfirmMatchId).toBe('match123')

    state = historyReducer(state, { type: 'dismissDeleteConfirm' })

    expect(state.deleteConfirmMatchId).toBeUndefined()
  })

  it('date formatting includes the time as HH:mm', () => {
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1672566300000, 'gt1', [{ playerId: 'p1', score: 10 }]))
    const { getMatches, getPlayers, getGameTypes } = buildUseCases(undefined, undefined, matchRepo)

    const [display] = loadDisplays(getMatches, getPlayers, getGameTypes)

    expect(display.dateFormatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it('selectGameTypeFilter sets the filter without touching displays', () => {
    let state = historyReducer(initialHistoryState, { type: 'loaded', displays: [] })
    state = { ...state, displays: [{} as never, {} as never, {} as never] }

    state = historyReducer(state, { type: 'selectGameTypeFilter', gameTypeId: 'gt1' })

    expect(state.selectedGameTypeFilter).toBe('gt1')
    expect(state.displays).toHaveLength(3)
  })

  it('selectGameTypeFilter with undefined resets the filter', () => {
    let state = historyReducer(initialHistoryState, { type: 'selectGameTypeFilter', gameTypeId: 'gt1' })
    expect(state.selectedGameTypeFilter).toBe('gt1')

    state = historyReducer(state, { type: 'selectGameTypeFilter', gameTypeId: undefined })

    expect(state.selectedGameTypeFilter).toBeUndefined()
  })

  it('the filter persists across a reload', () => {
    let state = historyReducer(initialHistoryState, { type: 'loaded', displays: [] })
    state = historyReducer(state, { type: 'selectGameTypeFilter', gameTypeId: 'gt1' })

    state = historyReducer(state, { type: 'loaded', displays: [] })

    expect(state.selectedGameTypeFilter).toBe('gt1')
  })

  it('showRounds records the match whose round detail is being viewed', () => {
    const state = historyReducer(initialHistoryState, { type: 'showRounds', matchId: 'm1' })

    expect(state.roundsMatchId).toBe('m1')
  })

  it('dismissRounds closes the round detail modal', () => {
    const opened = historyReducer(initialHistoryState, { type: 'showRounds', matchId: 'm1' })

    expect(historyReducer(opened, { type: 'dismissRounds' }).roundsMatchId).toBeUndefined()
  })

  it('reloading the list closes the round detail modal', () => {
    const opened = historyReducer(initialHistoryState, { type: 'showRounds', matchId: 'm1' })

    expect(historyReducer(opened, { type: 'loaded', displays: [] }).roundsMatchId).toBeUndefined()
  })
})

function buildDisplay(overrides: Partial<MatchDisplay> = {}): MatchDisplay {
  return {
    match: match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]),
    gameType: gameType('gt1', 'Test'),
    players: {},
    playerLabels: { p1: 'Alice', p2: 'Bob' },
    winners: ['p1'],
    dateFormatted: '2026-01-01 10:00',
    isTieBreakIndeterminate: false,
    ...overrides,
  }
}

describe('buildScoreSummary', () => {
  it('marks the sole winner and keeps the players in scoring order', () => {
    const parts = buildScoreSummary(buildDisplay())

    expect(parts).toEqual([
      { playerId: 'p1', text: 'Alice 10', isWinner: true },
      { playerId: 'p2', text: 'Bob 5', isWinner: false },
    ])
  })

  it('marks every tied player as a winner', () => {
    const parts = buildScoreSummary(buildDisplay({ winners: ['p1', 'p2'] }))

    expect(parts.every((p) => p.isWinner)).toBe(true)
  })

  it('falls back to the raw player id when the label is unknown', () => {
    const parts = buildScoreSummary(buildDisplay({ playerLabels: {} }))

    expect(parts[0].text).toBe('p1 10')
  })
})

describe('buildRoundBreakdown', () => {
  const rounds = [
    [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ],
    [
      { playerId: 'p1', score: 3 },
      { playerId: 'p2', score: 7 },
    ],
  ]

  it('numbers the rounds and resolves each participant in scoring order', () => {
    const display = buildDisplay({
      match: match(
        'm1',
        1000,
        'gt1',
        [
          { playerId: 'p1', score: 13 },
          { playerId: 'p2', score: 12 },
        ],
        { rounds },
      ),
    })

    expect(buildRoundBreakdown(display)).toEqual([
      {
        roundNumber: 1,
        cells: [
          { playerId: 'p1', label: 'Alice', score: 10 },
          { playerId: 'p2', label: 'Bob', score: 5 },
        ],
      },
      {
        roundNumber: 2,
        cells: [
          { playerId: 'p1', label: 'Alice', score: 3 },
          { playerId: 'p2', label: 'Bob', score: 7 },
        ],
      },
    ])
  })

  it('scores a player absent from a round as zero, keeping the cells aligned', () => {
    const display = buildDisplay({
      match: match(
        'm1',
        1000,
        'gt1',
        [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 0 },
        ],
        { rounds: [[{ playerId: 'p1', score: 10 }]] },
      ),
    })

    expect(buildRoundBreakdown(display)[0].cells).toEqual([
      { playerId: 'p1', label: 'Alice', score: 10 },
      { playerId: 'p2', label: 'Bob', score: 0 },
    ])
  })

  it('falls back to the raw player id when the label is unknown', () => {
    const display = buildDisplay({
      playerLabels: {},
      match: match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }], {
        rounds: [[{ playerId: 'p1', score: 10 }]],
        moduleData: null,
      }),
    })

    expect(buildRoundBreakdown(display)[0].cells[0].label).toBe('p1')
  })

  it('returns no rows for a match stored without round detail', () => {
    expect(buildRoundBreakdown(buildDisplay())).toEqual([])
  })
})
