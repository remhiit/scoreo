import { describe, expect, it, vi } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import { roundDetailStatus, type Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import { CreateMatchUseCase } from '../../application/createMatchUseCase'
import { UpdateMatchUseCase } from '../../application/updateMatchUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import {
  buildInitialState,
  computeScores,
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
    scoringMode: 'POINTS' as const,
    tieBreakRule,
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel,
    moduleId: null,
    active: true,
  }
}

function player(id: string, name: string): Player {
  return { id, name, active: true }
}

const alice = player('alice', 'Alice')
const bob = player('bob', 'Bob')
const carol = player('carol', 'Carol')

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
    this.state = scoreDetailReducer(this.state, {
      type: 'updateScore',
      roundIndex,
      playerId,
      value,
    })
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
    this.state = scoreDetailReducer(this.state, {
      type: 'updateSecondaryScoreInput',
      playerId,
      value,
    })
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

/** Edit mode over a pre-saved match, the way History opens an existing match. */
function buildEditHarness(rounds: Match['rounds'], playerScores: Match['playerScores']) {
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
    playerScores,
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds,
    moduleData: null,
  })
  const mode: ScoreDetailMode = {
    type: 'Edit',
    matchId: 'm1',
    updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
    matchRepository: matchRepo,
    playerRepository: playerRepo,
    gameTypeRepository: gameTypeRepo,
  }
  return { harness: new Harness(gt, [alice, bob], matchRepo, gameTypeRepo, mode), matchRepo }
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
    const { harness } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'),
    )
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
    const { harness } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'),
    )
    harness.givenTiedScores()
    expect(harness.state.showManualSelectionDialog).toBe(true)

    harness.confirmManualWinners()

    expect(harness.state.error).toBe('Select at least one winner')
    expect(harness.state.showManualSelectionDialog).toBe(true)
  })

  it('toggleManualSelectionWinner adds and removes a selection', () => {
    const { harness } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'),
    )
    harness.givenTiedScores()

    harness.toggleManualSelectionWinner('alice')
    expect(harness.state.manualSelectionWinners.has('alice')).toBe(true)

    harness.toggleManualSelectionWinner('alice')
    expect(harness.state.manualSelectionWinners.has('alice')).toBe(false)
  })

  it('dismissTieBreak closes all tie-break dialogs', () => {
    const { harness } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'MANUAL_SELECTION'),
    )
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
    const { harness } = buildHarnessWithGameType(
      gameType('gt1', 'TestGame', 'HIGHEST_SCORE', 'SECONDARY_SCORE'),
    )
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
      moduleData: null,
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

  it('reconstructRounds falls back to a single round of totals when no round detail was stored', () => {
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
      moduleData: null,
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

  it('rebuilds the editor from the stored rounds when the match has round detail', () => {
    const { harness } = buildEditHarness(
      [
        [
          { playerId: 'alice', score: 10 },
          { playerId: 'bob', score: 5 },
        ],
        [
          { playerId: 'alice', score: 3 },
          { playerId: 'bob', score: 7 },
        ],
      ],
      [
        { playerId: 'alice', score: 13 },
        { playerId: 'bob', score: 12 },
      ],
    )

    expect(harness.state.rounds).toEqual([
      { alice: '10', bob: '5' },
      { alice: '3', bob: '7' },
    ])
    expect(harness.totals().get('alice')).toBe(13)
    expect(harness.totals().get('bob')).toBe(12)
  })

  it('re-saving an edited match without changing anything keeps its stored round detail', () => {
    const rounds = [
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      [
        { playerId: 'alice', score: 3 },
        { playerId: 'bob', score: 7 },
      ],
    ]
    const { harness, matchRepo } = buildEditHarness(rounds, [
      { playerId: 'alice', score: 13 },
      { playerId: 'bob', score: 12 },
    ])

    harness.terminate()

    expect(harness.state.saved).toBe(true)
    expect(matchRepo.findById('m1')?.rounds).toEqual(rounds)
    expect(matchRepo.findById('m1')?.playerScores).toEqual([
      { playerId: 'alice', score: 13 },
      { playerId: 'bob', score: 12 },
    ])
  })

  it('leaves a player out of the editor cell when a stored round omits them', () => {
    const { harness } = buildEditHarness(
      [[{ playerId: 'alice', score: 10 }], [{ playerId: 'bob', score: 5 }]],
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
    )

    expect(harness.state.rounds).toEqual([{ alice: '10' }, { bob: '5' }])
    expect(harness.totals().get('alice')).toBe(10)
    expect(harness.totals().get('bob')).toBe(5)
  })

  it('shows the stored rounds with a warning when they do not sum to the totals', () => {
    const { harness } = buildEditHarness(
      [
        [
          { playerId: 'alice', score: 10 },
          { playerId: 'bob', score: 5 },
        ],
      ],
      [
        { playerId: 'alice', score: 100 },
        { playerId: 'bob', score: 12 },
      ],
    )

    expect(harness.state.rounds).toEqual([{ alice: '10', bob: '5' }])
    expect(harness.state.inconsistentRoundDetail).toBe(true)
  })

  it('recomputes the scores from inconsistent round detail when re-saved unchanged', () => {
    const rounds = [
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
    ]
    const { harness, matchRepo } = buildEditHarness(rounds, [
      { playerId: 'alice', score: 100 },
      { playerId: 'bob', score: 12 },
    ])

    harness.terminate()

    expect(harness.state.saved).toBe(true)
    const saved = matchRepo.findById('m1')!
    expect(saved.rounds).toEqual(rounds)
    expect(saved.playerScores).toEqual([
      { playerId: 'alice', score: 10 },
      { playerId: 'bob', score: 5 },
    ])
    // The detail is authoritative: the match is consistent again.
    expect(roundDetailStatus(saved, 'HIGHEST_SCORE')).toBe('consistent')
  })

  it('stores and counts a round added to a match with inconsistent round detail', () => {
    const rounds = [
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
    ]
    const { harness, matchRepo } = buildEditHarness(rounds, [
      { playerId: 'alice', score: 100 },
      { playerId: 'bob', score: 12 },
    ])

    for (const action of [
      { type: 'openRoundSheet' },
      { type: 'updateRoundSheetInput', playerId: 'alice', value: 3 },
      { type: 'updateRoundSheetInput', playerId: 'bob', value: 7 },
      { type: 'submitRoundSheet' },
    ] as const) {
      harness.state = scoreDetailReducer(harness.state, action)
    }
    harness.terminate()

    const saved = matchRepo.findById('m1')!
    expect(saved.rounds).toEqual([
      ...rounds,
      [
        { playerId: 'alice', score: 3 },
        { playerId: 'bob', score: 7 },
      ],
    ])
    expect(saved.playerScores).toEqual([
      { playerId: 'alice', score: 13 },
      { playerId: 'bob', score: 12 },
    ])
  })

  it('does not flag a match whose round detail agrees with its scores', () => {
    const { harness } = buildEditHarness(
      [
        [
          { playerId: 'alice', score: 10 },
          { playerId: 'bob', score: 5 },
        ],
      ],
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
    )
    expect(harness.state.inconsistentRoundDetail).toBe(false)
  })

  it('shows the stored rounds, without outsiders, when a stored round names a player outside the match', () => {
    const { harness } = buildEditHarness(
      [
        [
          { playerId: 'alice', score: 10 },
          { playerId: 'carol', score: 5 },
        ],
      ],
      [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 0 },
      ],
    )

    expect(harness.state.rounds).toEqual([{ alice: '10' }])
    expect(harness.state.inconsistentRoundDetail).toBe(true)
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
      moduleData: null,
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

  it('terminate saves edited scores of a match stored without detail as a single round in edit mode', () => {
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
      moduleData: null,
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
    expect(updated?.playerScores).toEqual([
      { playerId: 'alice', score: 15 },
      { playerId: 'bob', score: 10 },
    ])
    // In points, the synthetic detail of a match stored without any is a single
    // round holding the final scores, saved like any entered round.
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
      moduleData: null,
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
      moduleData: null,
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
      moduleData: null,
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

  it("terminate does not reject today's local date as a future date when the UTC day is still yesterday", () => {
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
      state = scoreDetailReducer(state, {
        type: 'updateScore',
        roundIndex: 0,
        playerId: 'alice',
        value: '10',
      })
      state = scoreDetailReducer(state, {
        type: 'updateScore',
        roundIndex: 0,
        playerId: 'bob',
        value: '5',
      })
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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness1 = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

    harness1.updateScore(0, 'alice', '10')
    harness1.updateScore(0, 'bob', '5')
    harness1.addRound()
    harness1.updateScore(1, 'alice', '3')
    harness1.updateScore(1, 'bob', '7')

    const harness2 = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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

    const harness1 = new Harness(
      gameType1,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )
    harness1.updateScore(0, 'alice', '10')

    const harness2 = new Harness(
      gameType2,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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

    const harness1 = new Harness(
      gt,
      players1,
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )
    harness1.updateScore(0, 'alice', '10')

    const harness2 = new Harness(
      gt,
      players2,
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

    expect(harness2.state.rounds).toHaveLength(1)
    expect(harness2.state.rounds[0]).toEqual({})
  })

  it('cancelling the match clears the draft', () => {
    const gt = gameType('gt1', 'TestGame')
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const draftRepo = new InMemoryMatchDraftRepository()
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const harness = new Harness(
      gt,
      [alice, bob],
      matchRepo,
      gameTypeRepo,
      { type: 'Create' },
      draftRepo,
    )

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
    const rows = computeStandings(
      gt,
      [alice, bob, charlie],
      [{ alice: '10', bob: '30', charlie: '20' }],
    )

    expect(rows.map((r) => r.playerId)).toEqual(['bob', 'charlie', 'alice'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('ranks players by ascending total for LOWEST_SCORE', () => {
    const gt = gameType('gt1', 'TestGame', 'LOWEST_SCORE')
    const rows = computeStandings(
      gt,
      [alice, bob, charlie],
      [{ alice: '10', bob: '30', charlie: '20' }],
    )

    expect(rows.map((r) => r.playerId)).toEqual(['alice', 'charlie', 'bob'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('tied totals share the same rank and the next rank skips accordingly', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(
      gt,
      [alice, bob, charlie],
      [{ alice: '20', bob: '20', charlie: '10' }],
    )

    const byId = new Map(rows.map((r) => [r.playerId, r]))
    expect(byId.get('alice')?.rank).toBe(1)
    expect(byId.get('bob')?.rank).toBe(1)
    expect(byId.get('charlie')?.rank).toBe(3)
  })

  it('marks every rank-1 row as lead, even when tied for first', () => {
    const gt = gameType('gt1', 'TestGame', 'HIGHEST_SCORE')
    const rows = computeStandings(
      gt,
      [alice, bob, charlie],
      [{ alice: '20', bob: '20', charlie: '10' }],
    )

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

describe('rounds-won scoring mode', () => {
  function roundsWonGame(winCondition: GameType['winCondition']): GameType {
    return { ...gameType('gt1', 'Tarot', winCondition), scoringMode: 'ROUNDS_WON' }
  }

  function setup(gt: GameType, rounds: Record<string, string>[], mode?: ScoreDetailMode) {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gt)
    const matchRepo = new InMemoryMatchRepository()
    const deps: ScoreDetailDeps = {
      createMatch: new CreateMatchUseCase(matchRepo, gameTypeRepo),
      mode: mode ?? { type: 'Create' },
      currentDate: () => 1767225600000,
    }
    const state = { ...buildInitialState(gt, [alice, bob], deps.mode, deps.currentDate), rounds }
    return { state, deps, matchRepo }
  }

  const rounds: Record<string, string>[] = [
    { alice: '10', bob: '3' },
    { alice: '1', bob: '4' },
    { alice: '9', bob: '9' },
    {},
  ]

  it('counts rounds won, ignoring the blank trailing round', () => {
    const scores = computeScores(roundsWonGame('HIGHEST_SCORE'), [alice, bob], rounds)
    expect(scores.get('alice')).toBe(2)
    expect(scores.get('bob')).toBe(2)
  })

  it('reports zero for everyone when no round was played', () => {
    const scores = computeScores(roundsWonGame('HIGHEST_SCORE'), [alice, bob], [{}])
    expect([...scores.values()]).toEqual([0, 0])
  })

  it('treats a blank cell in a played round as 0', () => {
    const scores = computeScores(roundsWonGame('LOWEST_SCORE'), [alice, bob], [{ alice: '5' }])
    expect(scores.get('bob')).toBe(1)
    expect(scores.get('alice')).toBe(0)
  })

  it('ranks standings by rounds won, most first, even for LOWEST_SCORE', () => {
    const standings = computeStandings(
      roundsWonGame('LOWEST_SCORE'),
      [alice, bob],
      [
        { alice: '1', bob: '9' },
        { alice: '2', bob: '9' },
        { alice: '9', bob: '1' },
      ],
    )
    expect(standings.map((r) => [r.playerId, r.total, r.rank])).toEqual([
      ['alice', 2, 1],
      ['bob', 1, 2],
    ])
  })

  it('keeps POINTS standings unchanged', () => {
    const standings = computeStandings(gameType('gt1', 'G'), [alice, bob], rounds)
    expect(standings.map((r) => r.total)).toEqual([20, 16])
  })

  it('saves rounds won as the score and the raw points as rounds', () => {
    const { state, deps, matchRepo } = setup(roundsWonGame('LOWEST_SCORE'), [
      { alice: '1', bob: '9' },
      { alice: '2', bob: '9' },
      { alice: '9', bob: '1' },
      {},
    ])
    const next = scoreDetailReducer(state, submitTerminate(state, deps))
    expect(next.saved).toBe(true)
    const match = matchRepo.getAll()[0]
    expect(match.playerScores).toEqual([
      { playerId: 'alice', score: 2 },
      { playerId: 'bob', score: 1 },
    ])
    expect(match.rounds).toEqual([
      [
        { playerId: 'alice', score: 1 },
        { playerId: 'bob', score: 9 },
      ],
      [
        { playerId: 'alice', score: 2 },
        { playerId: 'bob', score: 9 },
      ],
      [
        { playerId: 'alice', score: 9 },
        { playerId: 'bob', score: 1 },
      ],
    ])
  })

  it('uses the tie-break rule when rounds won are tied', () => {
    const gt: GameType = { ...roundsWonGame('HIGHEST_SCORE'), tieBreakRule: 'MANUAL_SELECTION' }
    const { state, deps } = setup(gt, [
      { alice: '5', bob: '1' },
      { alice: '1', bob: '5' },
    ])
    const action = submitTerminate(state, deps)
    expect(action.type).toBe('openManualSelectionDialog')
  })

  function legacyRoundsWonMatch(
    winCondition: GameType['winCondition'] = 'HIGHEST_SCORE',
    stored: [number, number] = [3, 2],
  ) {
    const gt = roundsWonGame(winCondition)
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
        { playerId: 'alice', score: stored[0] },
        { playerId: 'bob', score: stored[1] },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })
    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const { deps } = setup(gt, [], mode)
    const reopened = buildInitialState(gt, [alice, bob], mode, deps.currentDate)
    return { gt, deps, matchRepo, reopened }
  }

  function addRound(state: ScoreDetailState, aliceScore: number, bobScore: number) {
    let next = scoreDetailReducer(state, { type: 'openRoundSheet' })
    next = scoreDetailReducer(next, {
      type: 'updateRoundSheetInput',
      playerId: 'alice',
      value: aliceScore,
    })
    next = scoreDetailReducer(next, {
      type: 'updateRoundSheetInput',
      playerId: 'bob',
      value: bobScore,
    })
    return scoreDetailReducer(next, { type: 'submitRoundSheet' })
  }

  const storedScores = (matchRepo: InMemoryMatchRepository) =>
    matchRepo.findById('m1')!.playerScores.map((ps) => ps.score)

  it('replays a match without round detail as one won round per round won (HIGHEST_SCORE)', () => {
    const { gt, reopened } = legacyRoundsWonMatch('HIGHEST_SCORE', [3, 2])
    expect(reopened.inconsistentRoundDetail).toBe(false)
    expect(reopened.rounds).toEqual([
      { alice: '1', bob: '0' },
      { alice: '1', bob: '0' },
      { alice: '1', bob: '0' },
      { alice: '0', bob: '1' },
      { alice: '0', bob: '1' },
    ])
    const scores = computeScores(gt, reopened.players, reopened.rounds)
    expect([scores.get('alice'), scores.get('bob')]).toEqual([3, 2])
  })

  it('replays a match without round detail with the winner at 0 and the others at 1 (LOWEST_SCORE)', () => {
    const { gt, reopened } = legacyRoundsWonMatch('LOWEST_SCORE', [3, 2])
    expect(reopened.rounds).toEqual([
      { alice: '0', bob: '1' },
      { alice: '0', bob: '1' },
      { alice: '0', bob: '1' },
      { alice: '1', bob: '0' },
      { alice: '1', bob: '0' },
    ])
    const scores = computeScores(gt, reopened.players, reopened.rounds)
    expect([scores.get('alice'), scores.get('bob')]).toEqual([3, 2])
  })

  it('keeps the stored scores when a match without round detail is re-saved unchanged', () => {
    for (const winCondition of ['HIGHEST_SCORE', 'LOWEST_SCORE'] as const) {
      const { deps, matchRepo, reopened } = legacyRoundsWonMatch(winCondition, [3, 2])
      const next = scoreDetailReducer(reopened, submitTerminate(reopened, deps))
      expect(next.saved).toBe(true)
      expect(storedScores(matchRepo)).toEqual([3, 2])
      // The synthetic detail is saved like any entered rounds, and agrees with the scores.
      const match = matchRepo.findById('m1')!
      expect(match.rounds).toHaveLength(5)
      expect(roundDetailStatus(match, winCondition)).toBe('consistent')
    }
  })

  it('counts a round added to a match without round detail on top of its stored rounds won', () => {
    const highest = legacyRoundsWonMatch('HIGHEST_SCORE', [3, 2])
    const afterHighest = addRound(highest.reopened, 10, 2)
    scoreDetailReducer(afterHighest, submitTerminate(afterHighest, highest.deps))
    expect(storedScores(highest.matchRepo)).toEqual([4, 2])

    const lowest = legacyRoundsWonMatch('LOWEST_SCORE', [3, 2])
    const afterLowest = addRound(lowest.reopened, 10, 2)
    scoreDetailReducer(afterLowest, submitTerminate(afterLowest, lowest.deps))
    expect(storedScores(lowest.matchRepo)).toEqual([3, 3])
  })

  it('opens an empty round for a match without round detail where nobody won a round', () => {
    const { reopened } = legacyRoundsWonMatch('HIGHEST_SCORE', [0, 0])
    expect(reopened.rounds).toEqual([{}])
  })

  it('flags as inconsistent, and replays as one round, stored scores that cannot be counts of rounds won', () => {
    const { deps, matchRepo, reopened } = legacyRoundsWonMatch('HIGHEST_SCORE', [-1, 2])
    expect(reopened.inconsistentRoundDetail).toBe(true)
    expect(reopened.rounds).toEqual([{ alice: '-1', bob: '2' }])
    scoreDetailReducer(reopened, submitTerminate(reopened, deps))
    // Like any detail shown in the editor, that round is saved and scored with the current mode.
    expect(storedScores(matchRepo)).toEqual([0, 1])
    expect(matchRepo.findById('m1')!.rounds).toEqual([
      [
        { playerId: 'alice', score: -1 },
        { playerId: 'bob', score: 2 },
      ],
    ])
  })

  it('gives +1 to every winner of the last entered round and no delta to the others', () => {
    const standings = computeStandings(
      roundsWonGame('LOWEST_SCORE'),
      [alice, bob, carol],
      [{ alice: '9', bob: '1', carol: '5' }, { alice: '2', bob: '2', carol: '7' }, {}],
    )
    const byId = new Map(standings.map((r) => [r.playerId, r.delta]))
    expect(byId.get('alice')).toBe(1)
    expect(byId.get('bob')).toBe(1)
    expect(byId.get('carol')).toBeNull()
  })

  it('shows no delta before any round was played in a rounds-won game', () => {
    const standings = computeStandings(roundsWonGame('HIGHEST_SCORE'), [alice, bob], [{}])
    expect(standings.map((r) => r.delta)).toEqual([null, null])
  })

  it('restores raw points when reopening a match for editing', () => {
    const gt = roundsWonGame('HIGHEST_SCORE')
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
        { playerId: 'alice', score: 1 },
        { playerId: 'bob', score: 1 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [
        [
          { playerId: 'alice', score: 10 },
          { playerId: 'bob', score: 3 },
        ],
        [
          { playerId: 'alice', score: 1 },
          { playerId: 'bob', score: 4 },
        ],
      ],
      moduleData: null,
    })
    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const state = buildInitialState(gt, [alice, bob], mode, () => 1767225600000)
    expect(state.rounds).toEqual([
      { alice: '10', bob: '3' },
      { alice: '1', bob: '4' },
    ])
    expect(computeScores(gt, state.players, state.rounds).get('alice')).toBe(1)
  })

  // Raw rounds 10/2, 1/8, 9/3: 20/13 in points, 2/1 in rounds won (highest wins a round).
  const rawRounds = [
    [
      { playerId: 'alice', score: 10 },
      { playerId: 'bob', score: 2 },
    ],
    [
      { playerId: 'alice', score: 1 },
      { playerId: 'bob', score: 8 },
    ],
    [
      { playerId: 'alice', score: 9 },
      { playerId: 'bob', score: 3 },
    ],
  ]

  function reopenUnder(gt: GameType, stored: [number, number]) {
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
        { playerId: 'alice', score: stored[0] },
        { playerId: 'bob', score: stored[1] },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: rawRounds,
      moduleData: null,
    })
    const mode: ScoreDetailMode = {
      type: 'Edit',
      matchId: 'm1',
      updateMatchUseCase: new UpdateMatchUseCase(matchRepo),
      matchRepository: matchRepo,
      playerRepository: playerRepo,
      gameTypeRepository: gameTypeRepo,
    }
    const { deps } = setup(gt, [], mode)
    const reopened = buildInitialState(gt, [alice, bob], mode, deps.currentDate)
    return { deps, matchRepo, reopened }
  }

  it('recomputes in points a rounds-won match reopened after the game went back to POINTS', () => {
    const { deps, matchRepo, reopened } = reopenUnder(gameType('gt1', 'Tarot'), [2, 1])
    expect(reopened.rounds).toEqual([
      { alice: '10', bob: '2' },
      { alice: '1', bob: '8' },
      { alice: '9', bob: '3' },
    ])
    expect(reopened.inconsistentRoundDetail).toBe(false)

    const next = scoreDetailReducer(reopened, submitTerminate(reopened, deps))

    expect(next.saved).toBe(true)
    const match = matchRepo.findById('m1')!
    expect(match.playerScores).toEqual([
      { playerId: 'alice', score: 20 },
      { playerId: 'bob', score: 13 },
    ])
    expect(match.rounds).toEqual(rawRounds)
  })

  it('recomputes in rounds won a points match reopened after the game switched to ROUNDS_WON', () => {
    const { deps, matchRepo, reopened } = reopenUnder(roundsWonGame('HIGHEST_SCORE'), [20, 13])

    scoreDetailReducer(reopened, submitTerminate(reopened, deps))

    const match = matchRepo.findById('m1')!
    expect(match.playerScores).toEqual([
      { playerId: 'alice', score: 2 },
      { playerId: 'bob', score: 1 },
    ])
    expect(match.rounds).toEqual(rawRounds)
  })

  it('shows the stored rounds of a rounds-won match whose detail disagrees, and recomputes from them on save', () => {
    const { deps, matchRepo, reopened } = reopenUnder(roundsWonGame('HIGHEST_SCORE'), [5, 4])
    expect(reopened.inconsistentRoundDetail).toBe(true)
    expect(reopened.rounds).toEqual([
      { alice: '10', bob: '2' },
      { alice: '1', bob: '8' },
      { alice: '9', bob: '3' },
    ])

    scoreDetailReducer(reopened, submitTerminate(reopened, deps))

    const match = matchRepo.findById('m1')!
    expect(match.playerScores).toEqual([
      { playerId: 'alice', score: 2 },
      { playerId: 'bob', score: 1 },
    ])
    expect(match.rounds).toEqual(rawRounds)
  })
})
