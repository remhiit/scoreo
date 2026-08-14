import { describe, expect, it, vi } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { CreateMatchUseCase } from '../../application/createMatchUseCase'
import { UpdateMatchUseCase } from '../../application/updateMatchUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import {
  buildInitialState,
  computeStandings,
  computeTotals,
  countRoundsPlayed,
  leadHintLabel,
  nextRoundNumber,
  resetState,
  saveDraft,
  scoreDetailReducer,
  submitCancelMatch,
  submitConfirmCancel,
  submitConfirmManualWinners,
  submitConfirmWinners,
  submitKeepTie,
  submitSecondaryScores,
  submitTerminate,
  type ScoreDetailDeps,
} from './scoreDetailReducer'
import type { ScoreDetailMode, ScoreDetailState } from './scoreDetailTypes'

function gameType(
  id: string,
  name: string,
  winCondition: GameType['winCondition'] = 'HIGHEST_SCORE',
  tieBreakRule: GameType['tieBreakRule'] = 'NONE',
  tieBreakLabel: string | null = null,
): GameType {
  return {
    id,
    name,
    winCondition,
    tieBreakRule,
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel,
    active: true,
  }
}

function player(id: string, name: string): Player {
  return { id, name, active: true }
}

const alice = player('alice', 'Alice')
const bob = player('bob', 'Bob')

/** Mirrors the Kotlin `ScoreDetailHandler`, wiring the pure reducer + submit* side-effecting helpers together. */
class Harness {
  state: ScoreDetailState
  deps: ScoreDetailDeps

  constructor(
    gt: GameType,
    players: Player[],
    matchRepo: InMemoryMatchRepository,
    gameTypeRepo: InMemoryGameTypeRepository,
    mode: ScoreDetailMode = { type: 'Create' },
    matchDraftRepository?: InMemoryMatchDraftRepository,
  ) {
    this.deps = {
      createMatch: new CreateMatchUseCase(matchRepo, gameTypeRepo),
      mode,
      currentDate: () => 1767225600000,
      matchDraftRepository,
    }
    this.state = buildInitialState(gt, players, mode, this.deps.currentDate, matchDraftRepository)
  }

  private afterRoundsChange(before: Record<string, string>[]) {
    if (this.state.rounds !== before) {
      saveDraft(this.deps, this.state.gameType, this.state.players, this.state.rounds)
    }
  }

  updateMatchDate(value: string) {
    this.state = scoreDetailReducer(this.state, { type: 'updateMatchDate', value })
  }

  updateScore(roundIndex: number, playerId: string, value: string) {
    this.state = scoreDetailReducer(this.state, { type: 'updateScore', roundIndex, playerId, value })
    saveDraft(this.deps, this.state.gameType, this.state.players, this.state.rounds)
  }

  addRound() {
    this.state = scoreDetailReducer(this.state, { type: 'addRound' })
    saveDraft(this.deps, this.state.gameType, this.state.players, this.state.rounds)
  }

  removeRound(index: number) {
    const before = this.state.rounds
    this.state = scoreDetailReducer(this.state, { type: 'removeRound', index })
    this.afterRoundsChange(before)
  }

  openRoundSheet() {
    this.state = scoreDetailReducer(this.state, { type: 'openRoundSheet' })
  }

  closeRoundSheet() {
    this.state = scoreDetailReducer(this.state, { type: 'closeRoundSheet' })
  }

  updateRoundSheetInput(playerId: string, value: number) {
    this.state = scoreDetailReducer(this.state, { type: 'updateRoundSheetInput', playerId, value })
  }

  submitRoundSheet() {
    const before = this.state.rounds
    this.state = scoreDetailReducer(this.state, { type: 'submitRoundSheet' })
    this.afterRoundsChange(before)
  }

  terminate() {
    this.state = scoreDetailReducer(this.state, submitTerminate(this.state, this.deps))
  }

  dismissModal() {
    this.state = scoreDetailReducer(this.state, { type: 'dismissModal' })
  }

  toggleModalWinner(playerId: string) {
    this.state = scoreDetailReducer(this.state, { type: 'toggleModalWinner', playerId })
  }

  confirmWinners() {
    this.state = scoreDetailReducer(this.state, submitConfirmWinners(this.state, this.deps))
  }

  cancelMatch() {
    this.state = scoreDetailReducer(this.state, submitCancelMatch(this.state, this.deps))
  }

  confirmCancel() {
    this.state = scoreDetailReducer(this.state, submitConfirmCancel(this.deps))
  }

  dismissCancelConfirm() {
    this.state = scoreDetailReducer(this.state, { type: 'dismissCancelConfirm' })
  }

  updateSecondaryScoreInput(playerId: string, value: string) {
    this.state = scoreDetailReducer(this.state, { type: 'updateSecondaryScoreInput', playerId, value })
  }

  submitSecondaryScores() {
    this.state = scoreDetailReducer(this.state, submitSecondaryScores(this.state, this.deps))
  }

  toggleManualSelectionWinner(playerId: string) {
    this.state = scoreDetailReducer(this.state, { type: 'toggleManualSelectionWinner', playerId })
  }

  confirmManualWinners() {
    this.state = scoreDetailReducer(this.state, submitConfirmManualWinners(this.state, this.deps))
  }

  keepTie() {
    this.state = scoreDetailReducer(this.state, submitKeepTie(this.state, this.deps))
  }

  dismissTieBreak() {
    this.state = scoreDetailReducer(this.state, { type: 'dismissTieBreak' })
  }

  setViewMode(mode: ScoreDetailState['viewMode']) {
    this.state = scoreDetailReducer(this.state, { type: 'setViewMode', mode })
  }

  reset() {
    this.state = resetState(this.state.gameType, this.state.players, this.deps)
  }

  totals(): Map<string, number> {
    return computeTotals(this.state.players, this.state.rounds)
  }

  givenManualGameWithScores() {
    this.updateScore(0, 'alice', '10')
    this.updateScore(0, 'bob', '5')
    this.terminate()
    return this
  }

  givenTiedScores() {
    this.updateScore(0, 'alice', '10')
    this.updateScore(0, 'bob', '10')
    this.terminate()
    return this
  }
}

function buildHarness(
  winCondition: GameType['winCondition'] = 'HIGHEST_SCORE',
  players: Player[] = [alice, bob],
) {
  const gt = gameType('gt1', 'TestGame', winCondition)
  const gameTypeRepo = new InMemoryGameTypeRepository()
  gameTypeRepo.save(gt)
  const matchRepo = new InMemoryMatchRepository()
  return { harness: new Harness(gt, players, matchRepo, gameTypeRepo), matchRepo, gameTypeRepo }
}

function buildHarnessWithGameType(gt: GameType, players: Player[] = [alice, bob]) {
  const gameTypeRepo = new InMemoryGameTypeRepository()
  gameTypeRepo.save(gt)
  const matchRepo = new InMemoryMatchRepository()
  return { harness: new Harness(gt, players, matchRepo, gameTypeRepo), matchRepo, gameTypeRepo }
}

describe('scoreDetailReducer', () => {
  it('initial state has one empty round and no modal', () => {
    const { harness } = buildHarness()
    expect(harness.state.rounds).toHaveLength(1)
    expect(harness.state.rounds[0]).toEqual({})
    expect(harness.state.showWinnerModal).toBe(false)
    expect(harness.state.error).toBeUndefined()
    expect(harness.state.saved).toBe(false)
  })

  it('initial state defaults to the standings view', () => {
    const { harness } = buildHarness()
    expect(harness.state.viewMode).toBe('standings')
  })

  it('initial state defaults matchDate to today in create mode', () => {
    const { harness } = buildHarness()
    expect(harness.state.matchDate).toBe('2026-01-01')
  })

  it('updateMatchDate changes the matchDate', () => {
    const { harness } = buildHarness()
    harness.updateMatchDate('2026-01-05')
    expect(harness.state.matchDate).toBe('2026-01-05')
  })

  it('setViewMode switches between standings and history', () => {
    const { harness } = buildHarness()
    harness.setViewMode('history')
    expect(harness.state.viewMode).toBe('history')
    harness.setViewMode('standings')
    expect(harness.state.viewMode).toBe('standings')
  })

  it('addRound appends an empty round', () => {
    const { harness } = buildHarness()
    harness.addRound()
    expect(harness.state.rounds).toHaveLength(2)
    expect(harness.state.rounds[1]).toEqual({})
  })

  it('removeRound removes the round at the given index', () => {
    const { harness } = buildHarness()
    harness.addRound()
    harness.addRound()
    expect(harness.state.rounds).toHaveLength(3)
    harness.removeRound(1)
    expect(harness.state.rounds).toHaveLength(2)
  })

  it('removeRound does not remove the last remaining round', () => {
    const { harness } = buildHarness()
    harness.removeRound(0)
    expect(harness.state.rounds).toHaveLength(1)
  })

  it('removeRound with a negative index does nothing', () => {
    const { harness } = buildHarness()
    harness.removeRound(-1)
    expect(harness.state.rounds).toHaveLength(1)
  })

  it('removeRound with an out-of-bounds index does nothing', () => {
    const { harness } = buildHarness()
    harness.removeRound(99)
    expect(harness.state.rounds).toHaveLength(1)
  })

  it('openRoundSheet shows the sheet with every player defaulted to 0', () => {
    const { harness } = buildHarness()
    harness.openRoundSheet()
    expect(harness.state.showRoundSheet).toBe(true)
    expect(harness.state.roundSheetInputs).toEqual({ alice: 0, bob: 0 })
  })

  it('updateRoundSheetInput updates a single player entry', () => {
    const { harness } = buildHarness()
    harness.openRoundSheet()
    harness.updateRoundSheetInput('alice', 10)
    expect(harness.state.roundSheetInputs).toEqual({ alice: 10, bob: 0 })
  })

  it('closeRoundSheet hides the sheet without touching rounds', () => {
    const { harness } = buildHarness()
    harness.openRoundSheet()
    harness.updateRoundSheetInput('alice', 10)
    harness.closeRoundSheet()
    expect(harness.state.showRoundSheet).toBe(false)
    expect(harness.state.rounds).toEqual([{}])
  })

  it('submitRoundSheet fills the not-yet-played round and closes the sheet', () => {
    const { harness } = buildHarness()
    harness.openRoundSheet()
    harness.updateRoundSheetInput('alice', 10)
    harness.updateRoundSheetInput('bob', 5)
    harness.submitRoundSheet()
    expect(harness.state.showRoundSheet).toBe(false)
    expect(harness.state.rounds).toEqual([{ alice: '10', bob: '5' }])
  })

  it('submitRoundSheet appends a new round once all existing rounds are played', () => {
    const { harness } = buildHarness()
    harness.openRoundSheet()
    harness.updateRoundSheetInput('alice', 10)
    harness.updateRoundSheetInput('bob', 5)
    harness.submitRoundSheet()

    harness.openRoundSheet()
    harness.updateRoundSheetInput('alice', 3)
    harness.updateRoundSheetInput('bob', 7)
    harness.submitRoundSheet()

    expect(harness.state.rounds).toEqual([
      { alice: '10', bob: '5' },
      { alice: '3', bob: '7' },
    ])
  })

  it('submitRoundSheet saves a draft to the repository', () => {
    const draftRepo = new InMemoryMatchDraftRepository()
    const { harness } = buildHarness()
    harness.deps.matchDraftRepository = draftRepo
    harness.openRoundSheet()
    harness.updateRoundSheetInput('alice', 10)
    harness.submitRoundSheet()

    expect(draftRepo.load()?.rounds).toEqual([{ alice: '10', bob: '0' }])
  })

  it('nextRoundNumber counts the not-yet-played round as the round to enter', () => {
    expect(nextRoundNumber([{}])).toBe(1)
    expect(nextRoundNumber([{ alice: '10' }])).toBe(2)
    expect(nextRoundNumber([{ alice: '10' }, {}])).toBe(2)
  })

  it('updateScore stores the value and clears the error', () => {
    const { harness } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    expect(harness.state.rounds[0].alice).toBe('10')
    expect(harness.state.error).toBeUndefined()
  })

  it('terminate with valid scores and HIGHEST_SCORE saves the match', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].gameTypeId).toBe('gt1')
  })

  it('terminate with valid scores and LOWEST_SCORE saves the match', () => {
    const { harness, matchRepo } = buildHarness('LOWEST_SCORE')
    harness.updateScore(0, 'alice', '5')
    harness.updateScore(0, 'bob', '10')
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
  })

  it('terminate with MANUAL winCondition opens the modal instead of saving', () => {
    const { harness, matchRepo } = buildHarness('MANUAL')
    harness.givenManualGameWithScores()
    expect(harness.state.showWinnerModal).toBe(true)
    expect(harness.state.saved).toBe(false)
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('terminate with all scores empty treats them as zero and saves', () => {
    const { harness, matchRepo } = buildHarness()
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    const match = matchRepo.getAll()[0]
    expect(match.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(0)
    expect(match.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(0)
  })

  it('validateRounds treats an empty string as zero', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    const match = matchRepo.getAll()[0]
    expect(match.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(0)
    expect(match.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(5)
  })

  it('validateRounds treats an all-empty round as valid', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '')
    harness.updateScore(0, 'bob', '')
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    const match = matchRepo.getAll()[0]
    expect(match.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(0)
    expect(match.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(0)
  })

  it('terminate with an invalid score sets an error and does not save', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', 'abc')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()
    expect(harness.state.error).toBe('Invalid score for Alice in round 1: expected a number')
    expect(harness.state.saved).toBe(false)
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('validateRounds accepts a partially filled round', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '')
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    const match = matchRepo.getAll()[0]
    expect(match.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(10)
    expect(match.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(0)
  })

  it('totals computation treats empty cells as zero', () => {
    const { harness } = buildHarness()
    harness.updateScore(0, 'alice', '')
    harness.updateScore(0, 'bob', '5')
    const totals = harness.totals()
    expect(totals.get('alice')).toBe(0)
    expect(totals.get('bob')).toBe(5)
  })

  it('terminate accepts an all-empty round', () => {
    const { harness, matchRepo } = buildHarness()
    harness.terminate()
    expect(harness.state.saved).toBe(true)
    const match = matchRepo.getAll()[0]
    expect(match.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(0)
    expect(match.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(0)
  })

  it('manual winner selection never leaves totals null', () => {
    const { harness } = buildHarnessWithGameType(gameType('gt1', 'TestGame', 'MANUAL'))
    harness.updateScore(0, 'alice', '')
    harness.updateScore(0, 'bob', '')
    harness.terminate()
    expect(harness.state.showWinnerModal).toBe(true)
    const totals = harness.totals()
    expect(totals.get('alice')).toBe(0)
    expect(totals.get('bob')).toBe(0)
  })

  it('dismissModal closes the modal and clears the error', () => {
    const { harness } = buildHarness('MANUAL')
    harness.givenManualGameWithScores()
    expect(harness.state.showWinnerModal).toBe(true)
    harness.dismissModal()
    expect(harness.state.showWinnerModal).toBe(false)
    expect(harness.state.error).toBeUndefined()
  })

  it('toggleModalWinner adds and removes a winner', () => {
    const { harness } = buildHarness('MANUAL')
    harness.givenManualGameWithScores()
    harness.toggleModalWinner('alice')
    expect(harness.state.modalWinners.has('alice')).toBe(true)
    harness.toggleModalWinner('alice')
    expect(harness.state.modalWinners.has('alice')).toBe(false)
  })

  it('confirmWinners with an empty selection sets an error and does not save', () => {
    const { harness, matchRepo } = buildHarness('MANUAL')
    harness.givenManualGameWithScores()
    harness.confirmWinners()
    expect(harness.state.error).toBe('Select at least one winner')
    expect(harness.state.saved).toBe(false)
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('confirmWinners with a valid selection saves the match with manual winners', () => {
    const { harness, matchRepo } = buildHarness('MANUAL')
    harness.givenManualGameWithScores()
    harness.toggleModalWinner('alice')
    harness.confirmWinners()
    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice'])
  })

  it('saveMatch computes total scores across multiple rounds', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.addRound()
    harness.updateScore(1, 'alice', '3')
    harness.updateScore(1, 'bob', '7')
    harness.terminate()
    const match = matchRepo.getAll()[0]
    expect(match.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(13)
    expect(match.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(12)
  })

  it('saveMatch persists the per-round detail, consistent with the final playerScores', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.addRound()
    harness.updateScore(1, 'alice', '3')
    harness.updateScore(1, 'bob', '7')
    harness.terminate()
    const match = matchRepo.getAll()[0]
    expect(match.rounds).toEqual([
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      [
        { playerId: 'alice', score: 3 },
        { playerId: 'bob', score: 7 },
      ],
    ])
    for (const playerScore of match.playerScores) {
      const roundsSum = match.rounds.reduce(
        (sum, round) => sum + (round.find((s) => s.playerId === playerScore.playerId)?.score ?? 0),
        0,
      )
      expect(roundsSum).toBe(playerScore.score)
    }
  })

  it('saveMatch does not persist the trailing not-yet-played round', () => {
    const { harness, matchRepo } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.addRound()
    harness.terminate()
    const match = matchRepo.getAll()[0]
    expect(match.rounds).toHaveLength(1)
  })

  it('terminate with a tie and the NONE rule saves the match with all tied players as winners', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'NONE'),
    )
    harness.givenTiedScores()
    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice', 'bob'])
  })

  it('terminate with a tie and MANUAL_SELECTION shows the manual dialog', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'),
    )
    harness.givenTiedScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)
    expect(harness.state.tiedPlayerIds).toEqual(['alice', 'bob'])
    expect(harness.state.saved).toBe(false)
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('terminate with a tie and SECONDARY_SCORE shows the secondary score dialog', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE', 'Handicap'),
    )
    harness.givenTiedScores()
    expect(harness.state.showSecondaryScoreDialog).toBe(true)
    expect(harness.state.tiedPlayerIds).toEqual(['alice', 'bob'])
    expect(harness.state.secondaryScoreInputs.alice).toBe('')
    expect(harness.state.secondaryScoreInputs.bob).toBe('')
    expect(harness.state.saved).toBe(false)
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('SECONDARY_SCORE submit breaks the tie and saves the match', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'),
    )
    harness.givenTiedScores()
    expect(harness.state.showSecondaryScoreDialog).toBe(true)

    harness.updateSecondaryScoreInput('alice', '100')
    harness.updateSecondaryScoreInput('bob', '50')
    harness.submitSecondaryScores()

    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    const saved = matchRepo.getAll()[0]
    expect(saved.manualWinners).toEqual(['alice'])
    expect(saved.secondaryPlayerScores).toHaveLength(2)
  })

  it('SECONDARY_SCORE submit with a persisting tie shows manual selection', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'),
    )
    harness.givenTiedScores()
    expect(harness.state.showSecondaryScoreDialog).toBe(true)

    harness.updateSecondaryScoreInput('alice', '50')
    harness.updateSecondaryScoreInput('bob', '50')
    harness.submitSecondaryScores()

    expect(harness.state.showSecondaryScoreDialog).toBe(false)
    expect(harness.state.showManualSelectionDialog).toBe(true)
    expect(harness.state.tiedPlayerIds).toEqual(['alice', 'bob'])
    expect(harness.state.collectedSecondaryScores).toHaveLength(2)
    expect(harness.state.saved).toBe(false)
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('SECONDARY_SCORE with an invalid input shows an error', () => {
    const { harness } = buildHarnessWithGameType(gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'))
    harness.givenTiedScores()
    expect(harness.state.showSecondaryScoreDialog).toBe(true)

    harness.updateSecondaryScoreInput('alice', 'abc')
    harness.submitSecondaryScores()

    expect(harness.state.error).toBe('Invalid secondary score for one of the tied players')
    expect(harness.state.showSecondaryScoreDialog).toBe(true)
  })

  it('MANUAL_SELECTION with a selection saves the match with the chosen winner', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'),
    )
    harness.givenTiedScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)

    harness.toggleManualSelectionWinner('alice')
    harness.confirmManualWinners()

    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice'])
  })

  it('MANUAL_SELECTION with keep-tie saves all tied players as winners', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'),
    )
    harness.givenTiedScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)

    harness.keepTie()

    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['alice', 'bob'])
  })

  it('MANUAL_SELECTION with an empty selection shows an error', () => {
    const { harness } = buildHarnessWithGameType(gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'))
    harness.givenTiedScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)

    harness.confirmManualWinners()

    expect(harness.state.error).toBe('Select at least one winner')
    expect(harness.state.showManualSelectionDialog).toBe(true)
  })

  it('toggleManualSelectionWinner adds and removes a selection', () => {
    const { harness } = buildHarnessWithGameType(gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'))
    harness.givenTiedScores()

    harness.toggleManualSelectionWinner('alice')
    expect(harness.state.manualSelectionWinners.has('alice')).toBe(true)

    harness.toggleManualSelectionWinner('alice')
    expect(harness.state.manualSelectionWinners.has('alice')).toBe(false)
  })

  it('dismissTieBreak closes all tie-break dialogs', () => {
    const { harness } = buildHarnessWithGameType(gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'))
    harness.givenTiedScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)

    harness.dismissTieBreak()

    expect(harness.state.showManualSelectionDialog).toBe(false)
    expect(harness.state.showSecondaryScoreDialog).toBe(false)
    expect(harness.state.error).toBeUndefined()
  })

  it('a secondary tie broken via manual selection saves correctly', () => {
    const { harness, matchRepo } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'),
    )
    harness.givenTiedScores()
    expect(harness.state.showSecondaryScoreDialog).toBe(true)

    harness.updateSecondaryScoreInput('alice', '50')
    harness.updateSecondaryScoreInput('bob', '50')
    harness.submitSecondaryScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)

    harness.toggleManualSelectionWinner('alice')
    harness.confirmManualWinners()

    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
    const saved = matchRepo.getAll()[0]
    expect(saved.manualWinners).toEqual(['alice'])
    expect(saved.secondaryPlayerScores).toHaveLength(2)
  })

  it('updateSecondaryScoreInput updates the input map', () => {
    const { harness } = buildHarnessWithGameType(gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'))
    harness.givenTiedScores()

    harness.updateSecondaryScoreInput('alice', '75')

    expect(harness.state.secondaryScoreInputs.alice).toBe('75')
    expect(harness.state.error).toBeUndefined()
  })

  it('reset restores the initial state', () => {
    const { harness } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.addRound()
    harness.updateScore(1, 'bob', '5')
    harness.reset()
    expect(harness.state.rounds).toHaveLength(1)
    expect(harness.state.rounds[0]).toEqual({})
    expect(harness.state.showWinnerModal).toBe(false)
    expect(harness.state.error).toBeUndefined()
    expect(harness.state.saved).toBe(false)
  })

  it('loading a match for editing populates the state', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    const match: Match = {
      id: 'm1',
      gameTypeId: gt.id,
      date: 1000,
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    }
    matchRepo.save(match)

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)

    expect(harness.state.editingMatchId).toBe('m1')
    expect(harness.state.matchDate).toBe('1970-01-01')
    expect(harness.state.rounds).toHaveLength(1)
    expect(harness.state.rounds[0].alice).toBe('10')
    expect(harness.state.rounds[0].bob).toBe('5')
  })

  it('reconstructRounds always produces a single round', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    const match: Match = {
      id: 'm1',
      gameTypeId: gt.id,
      date: 1000,
      playerScores: [
        { playerId: 'alice', score: 30 },
        { playerId: 'bob', score: 20 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    }
    matchRepo.save(match)

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)

    expect(harness.state.rounds).toHaveLength(1)
    expect(harness.state.rounds[0].alice).toBe('30')
    expect(harness.state.rounds[0].bob).toBe('20')
  })

  it('terminate calls the update use case in edit mode', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    matchRepo.save({
      id: 'm1',
      gameTypeId: gt.id,
      date: 1000,
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)

    harness.updateScore(0, 'alice', '15')
    harness.updateScore(0, 'bob', '10')
    harness.terminate()

    expect(harness.state.saved).toBe(true)
    const updated = matchRepo.findById('m1')
    expect(updated?.playerScores.find((s) => s.playerId === 'alice')?.score).toBe(15)
    expect(updated?.playerScores.find((s) => s.playerId === 'bob')?.score).toBe(10)
  })

  it('terminate persists the edited rounds detail in edit mode', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    matchRepo.save({
      id: 'm1',
      gameTypeId: gt.id,
      date: 1000,
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)

    harness.updateScore(0, 'alice', '15')
    harness.updateScore(0, 'bob', '10')
    harness.terminate()

    const updated = matchRepo.findById('m1')
    expect(updated?.rounds).toEqual([
      [
        { playerId: 'alice', score: 15 },
        { playerId: 'bob', score: 10 },
      ],
    ])
  })

  it('edit mode preserves the match id', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    matchRepo.save({
      id: 'm1',
      gameTypeId: gt.id,
      date: 1000,
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)

    harness.updateScore(0, 'alice', '20')
    harness.terminate()

    expect(matchRepo.findById('m1')?.id).toBe('m1')
  })

  it('editing a match preserves its original date', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    const originalDate = 1000
    matchRepo.save({
      id: 'm1',
      gameTypeId: gt.id,
      date: originalDate,
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)

    harness.updateScore(0, 'alice', '20')
    harness.terminate()

    expect(matchRepo.findById('m1')?.date).toBe(originalDate)
  })

  it('editing a match with a changed date updates Match.date, keeping the original time-of-day', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(alice)
    playerRepo.save(bob)
    const originalDate = Date.UTC(2025, 11, 20, 14, 30, 5, 0)
    matchRepo.save({
      id: 'm1',
      gameTypeId: gt.id,
      date: originalDate,
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode)
    expect(harness.state.matchDate).toBe('2025-12-20')

    harness.updateMatchDate('2025-12-18')
    harness.updateScore(0, 'alice', '20')
    harness.terminate()

    expect(matchRepo.findById('m1')?.date).toBe(Date.UTC(2025, 11, 18, 14, 30, 5, 0))
  })

  it('create mode saves the chosen match date combined with the time-of-day from currentDate()', () => {
    const { harness, matchRepo } = buildHarness()

    harness.updateMatchDate('2025-12-20')
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()

    expect(harness.state.saved).toBe(true)
    const saved = matchRepo.getAll()[0]
    expect(saved.date).toBe(Date.UTC(2025, 11, 20, 0, 0, 0, 0))
  })

  it('terminate rejects a future match date and does not save', () => {
    const { harness, matchRepo } = buildHarness()

    harness.updateMatchDate('2026-01-02')
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()

    expect(harness.state.saved).toBe(false)
    expect(harness.state.error).toBeDefined()
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('terminate rejects an empty match date and does not save', () => {
    const { harness, matchRepo } = buildHarness()

    harness.updateMatchDate('')
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()

    expect(harness.state.saved).toBe(false)
    expect(harness.state.error).toBeDefined()
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('terminate rejects a calendar-invalid match date and does not save', () => {
    const { harness, matchRepo } = buildHarness()

    harness.updateMatchDate('2026-02-30')
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()

    expect(harness.state.saved).toBe(false)
    expect(harness.state.error).toBeDefined()
    expect(matchRepo.getAll()).toHaveLength(0)
  })

  it('terminate accepts a match date equal to today', () => {
    const { harness, matchRepo } = buildHarness()

    harness.updateMatchDate('2026-01-01')
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()

    expect(harness.state.saved).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
  })

  it('defaults matchDate to the local calendar day, not the UTC day, past midnight in a positive-offset timezone', () => {
    vi.stubEnv('TZ', 'Europe/Paris')
    try {
      const gt = gameType('gt1', 'TestGame')
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gt)
      // 2026-01-01 00:30 in Europe/Paris (UTC+1), but still 2025-12-31 in UTC.
      const currentDate = () => Date.UTC(2025, 11, 31, 23, 30, 0, 0)
      const state = buildInitialState(gt, [alice, bob], { type: 'Create' }, currentDate)

      expect(state.matchDate).toBe('2026-01-01')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('terminate does not reject today\'s local date as a future date when the UTC day is still yesterday', () => {
    vi.stubEnv('TZ', 'Europe/Paris')
    try {
      const gt = gameType('gt1', 'TestGame')
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gt)
      const matchRepo = new InMemoryMatchRepository()
      const currentDate = () => Date.UTC(2025, 11, 31, 23, 30, 0, 0)
      const deps: ScoreDetailDeps = {
        createMatch: new CreateMatchUseCase(matchRepo, gameTypeRepo),
        mode: { type: 'Create' },
        currentDate,
      }
      let state = buildInitialState(gt, [alice, bob], deps.mode, deps.currentDate)
      state = scoreDetailReducer(state, { type: 'updateScore', roundIndex: 0, playerId: 'alice', value: '10' })
      state = scoreDetailReducer(state, { type: 'updateScore', roundIndex: 0, playerId: 'bob', value: '5' })
      state = scoreDetailReducer(state, submitTerminate(state, deps))

      expect(state.error).toBeUndefined()
      expect(state.saved).toBe(true)
      expect(matchRepo.getAll()).toHaveLength(1)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('updateScore saves a draft to the repository', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')

    const draft = draftRepo.load()
    expect(draft).toBeDefined()
    expect(draft?.gameTypeId).toBe('gt1')
    expect(draft?.playerIds).toEqual(['alice', 'bob'])
    expect(draft?.rounds).toHaveLength(1)
    expect(draft?.rounds[0].alice).toBe('10')
  })

  it('addRound saves a draft to the repository', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')
    harness.addRound()

    const draft = draftRepo.load()
    expect(draft?.rounds).toHaveLength(2)
    expect(draft?.rounds[0].alice).toBe('10')
    expect(draft?.rounds[1]).toEqual({})
  })

  it('removeRound saves a draft to the repository', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')
    harness.addRound()
    harness.updateScore(1, 'bob', '5')
    harness.removeRound(1)

    const draft = draftRepo.load()
    expect(draft?.rounds).toHaveLength(1)
    expect(draft?.rounds[0].alice).toBe('10')
  })

  it('terminate clears the draft', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.terminate()

    expect(draftRepo.load()).toBeUndefined()
  })

  it('draft persists a full round trip across handler instances', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness1 = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness1.updateScore(0, 'alice', '10')
    harness1.updateScore(0, 'bob', '5')
    harness1.addRound()
    harness1.updateScore(1, 'alice', '3')
    harness1.updateScore(1, 'bob', '7')

    const harness2 = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    expect(harness2.state.rounds).toHaveLength(2)
    expect(harness2.state.rounds[0].alice).toBe('10')
    expect(harness2.state.rounds[0].bob).toBe('5')
    expect(harness2.state.rounds[1].alice).toBe('3')
    expect(harness2.state.rounds[1].bob).toBe('7')
  })

  it('empty cells are preserved in the draft', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')

    const draft = draftRepo.load()
    expect(draft?.rounds[0].alice).toBe('10')
    expect(draft?.rounds[0].bob === undefined || draft?.rounds[0].bob === '').toBe(true)
  })

  it('restoring ignores the draft if the game type does not match', () => {
    const gameType1 = gameType('gt1', 'Game1')
    const gameType2 = gameType('gt2', 'Game2')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType1)
    gameTypeRepo.save(gameType2)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()

    const harness1 = new Harness(gameType1, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)
    harness1.updateScore(0, 'alice', '10')

    const harness2 = new Harness(gameType2, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    expect(harness2.state.rounds).toHaveLength(1)
    expect(harness2.state.rounds[0]).toEqual({})
  })

  it('restoring ignores the draft if the player ids do not match', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const players1 = [alice, bob]
    const players2 = [player('charlie', 'Charlie'), player('dave', 'Dave')]

    const harness1 = new Harness(gt, players1, matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)
    harness1.updateScore(0, 'alice', '10')

    const harness2 = new Harness(gt, players2, matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    expect(harness2.state.rounds).toHaveLength(1)
    expect(harness2.state.rounds[0]).toEqual({})
  })

  it('cancelling the match clears the draft', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')
    harness.cancelMatch()
    harness.confirmCancel()

    expect(draftRepo.load()).toBeUndefined()
  })

  it('a failed terminate does not clear the draft', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')
    expect(draftRepo.load()).toBeDefined()

    harness.updateScore(0, 'bob', 'abc')
    harness.terminate()

    expect(harness.state.error).toBeDefined()
    expect(harness.state.saved).toBe(false)

    const draft = draftRepo.load()
    expect(draft).toBeDefined()
    expect(draft?.rounds[0].alice).toBe('10')
  })

  it('cancelling with empty rounds discards immediately', () => {
    const { harness } = buildHarness()
    harness.cancelMatch()
    expect(harness.state.showCancelConfirm).toBe(false)
    expect(harness.state.cancelled).toBe(true)
  })

  it('cancelling with entered scores shows the confirmation', () => {
    const { harness } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '')
    harness.cancelMatch()
    expect(harness.state.showCancelConfirm).toBe(true)
    expect(harness.state.cancelled).toBe(false)
  })

  it('cancelling after only adding a round is treated as empty', () => {
    const { harness } = buildHarness()
    harness.addRound()
    harness.cancelMatch()
    expect(harness.state.showCancelConfirm).toBe(false)
    expect(harness.state.cancelled).toBe(true)
  })

  it('dismissing the cancel confirmation keeps editing', () => {
    const { harness } = buildHarness()
    harness.updateScore(0, 'alice', '10')
    harness.cancelMatch()
    expect(harness.state.showCancelConfirm).toBe(true)

    harness.dismissCancelConfirm()

    expect(harness.state.showCancelConfirm).toBe(false)
    expect(harness.state.rounds[0].alice).toBe('10')
    expect(harness.state.cancelled).toBe(false)
  })

  it('confirming cancel discards the scores', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, { type: 'Create' }, draftRepo)

    harness.updateScore(0, 'alice', '10')
    harness.updateScore(0, 'bob', '5')
    harness.cancelMatch()
    expect(harness.state.showCancelConfirm).toBe(true)
    expect(draftRepo.load()).toBeDefined()

    harness.confirmCancel()

    expect(harness.state.showCancelConfirm).toBe(false)
    expect(harness.state.cancelled).toBe(true)
    expect(draftRepo.load()).toBeUndefined()
  })
})

describe('computeStandings', () => {
  const charlie = player('charlie', 'Charlie')

  it('ranks players by descending total for HIGHEST_SCORE', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(gt, [alice, bob, charlie], [{ alice: '10', bob: '30', charlie: '20' }])

    expect(rows.map((r) => r.playerId)).toEqual(['bob', 'charlie', 'alice'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('ranks players by ascending total for LOWEST_SCORE', () => {
    const gt = gameType('gt1', 'TestGame', 'LOWEST_SCORE')
    const rows = computeStandings(gt, [alice, bob, charlie], [{ alice: '10', bob: '30', charlie: '20' }])

    expect(rows.map((r) => r.playerId)).toEqual(['alice', 'charlie', 'bob'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('tied totals share the same rank and the next rank skips accordingly', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(gt, [alice, bob, charlie], [{ alice: '20', bob: '20', charlie: '10' }])

    const byId = new Map(rows.map((r) => [r.playerId, r]))
    expect(byId.get('alice')?.rank).toBe(1)
    expect(byId.get('bob')?.rank).toBe(1)
    expect(byId.get('charlie')?.rank).toBe(3)
  })

  it('marks every rank-1 row as lead, even when tied for first', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(gt, [alice, bob, charlie], [{ alice: '20', bob: '20', charlie: '10' }])

    const byId = new Map(rows.map((r) => [r.playerId, r]))
    expect(byId.get('alice')?.isLead).toBe(true)
    expect(byId.get('bob')?.isLead).toBe(true)
    expect(byId.get('charlie')?.isLead).toBe(false)
  })

  it('delta reflects only the last round entered, not the cumulative total', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(
      gt,
      [alice, bob],
      [
        { alice: '10', bob: '5' },
        { alice: '3', bob: '7' },
      ],
    )

    const byId = new Map(rows.map((r) => [r.playerId, r]))
    expect(byId.get('alice')?.total).toBe(13)
    expect(byId.get('alice')?.delta).toBe(3)
    expect(byId.get('bob')?.total).toBe(12)
    expect(byId.get('bob')?.delta).toBe(7)
  })

  it('treats an empty cell in the last round as a zero delta', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(gt, [alice, bob], [{ alice: '10', bob: '5' }, {}])

    const byId = new Map(rows.map((r) => [r.playerId, r]))
    expect(byId.get('alice')?.delta).toBe(0)
    expect(byId.get('bob')?.delta).toBe(0)
  })
})

describe('countRoundsPlayed', () => {
  it('counts only rounds with at least one non-empty cell', () => {
    expect(countRoundsPlayed([{ alice: '10' }, {}, { bob: '' }])).toBe(1)
    expect(countRoundsPlayed([{ alice: '10' }, { bob: '5' }])).toBe(2)
    expect(countRoundsPlayed([{}])).toBe(0)
  })
})

describe('leadHintLabel', () => {
  it('describes the win direction and the number of rounds played', () => {
    expect(leadHintLabel(gameType('gt1', 'TestGame', 'LOWEST_SCORE'), 3)).toBe(
      'After 3 rounds · lowest score leads',
    )
    expect(leadHintLabel(gameType('gt1', 'TestGame', 'HIGHEST_SCORE'), 1)).toBe(
      'After 1 round · highest score leads',
    )
  })

  it('has a distinct message when no round has been played yet', () => {
    expect(leadHintLabel(gameType('gt1', 'TestGame', 'HIGHEST_SCORE'), 0)).toBe(
      'No rounds played yet · highest score leads',
    )
  })
})
