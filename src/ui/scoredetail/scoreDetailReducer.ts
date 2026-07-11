import { computeWinners, type GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import type { PlayerScore } from '../../domain/model/playerScore'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'
import type { CreateMatchUseCase } from '../../application/createMatchUseCase'
import type { ScoreDetailMode, ScoreDetailState } from './scoreDetailTypes'

export interface ScoreDetailDeps {
  createMatch: CreateMatchUseCase
  mode: ScoreDetailMode
  currentDate: () => number
  matchDraftRepository?: MatchDraftRepository
}

/** Matches Kotlin's `String.toIntOrNull()`: digits only (optional leading minus), no whitespace/decimals. */
function toIntOrNull(s: string): number | null {
  return /^-?\d+$/.test(s) ? Number(s) : null
}

export function computeTotals(players: Player[], rounds: Record<string, string>[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const player of players) {
    let sum = 0
    for (const round of rounds) {
      const raw = round[player.id]
      const parsed = raw !== undefined ? toIntOrNull(raw.trim()) : null
      sum += parsed ?? 0
    }
    totals.set(player.id, sum)
  }
  return totals
}

function playerScoresFromTotals(state: ScoreDetailState): PlayerScore[] {
  const totals = computeTotals(state.players, state.rounds)
  return state.players.map((p) => ({ playerId: p.id, score: totals.get(p.id) ?? 0 }))
}

function hasUnsavedScores(rounds: Record<string, string>[]): boolean {
  return rounds.some((round) => Object.values(round).some((v) => v.trim() !== ''))
}

/** Mirrors ScoreDetailHandler.validateRounds(): "" is fine, any non-empty non-integer cell fails. */
function validateRounds(state: ScoreDetailState): { ok: true } | { ok: false; error: string } {
  if (state.rounds.length === 0) {
    return { ok: false, error: 'At least one round is required' }
  }
  for (let roundIndex = 0; roundIndex < state.rounds.length; roundIndex++) {
    for (const [playerId, scoreStr] of Object.entries(state.rounds[roundIndex])) {
      if (scoreStr.length > 0 && toIntOrNull(scoreStr) === null) {
        const playerName = state.players.find((p) => p.id === playerId)?.name ?? playerId
        return { ok: false, error: `Invalid score for ${playerName} in round ${roundIndex + 1}: expected a number` }
      }
    }
  }
  return { ok: true }
}

export type ScoreDetailAction =
  | { type: 'updateScore'; roundIndex: number; playerId: string; value: string }
  | { type: 'addRound' }
  | { type: 'removeRound'; index: number }
  | { type: 'cancelImmediate' }
  | { type: 'showCancelConfirm' }
  | { type: 'confirmCancel' }
  | { type: 'dismissCancelConfirm' }
  | { type: 'validationFailed'; error: string }
  | { type: 'openWinnerModal' }
  | { type: 'openManualSelectionDialog'; tiedPlayerIds: string[] }
  | { type: 'openSecondaryScoreDialog'; tiedPlayerIds: string[] }
  | { type: 'saved' }
  | { type: 'saveFailed'; error: string }
  | { type: 'dismissModal' }
  | { type: 'toggleModalWinner'; playerId: string }
  | { type: 'confirmWinnersEmptyError' }
  | { type: 'updateSecondaryScoreInput'; playerId: string; value: string }
  | { type: 'secondaryScoreInvalid' }
  | { type: 'secondaryScoreEscalate'; collectedSecondaryScores: PlayerScore[] }
  | { type: 'toggleManualSelectionWinner'; playerId: string }
  | { type: 'manualWinnersEmptyError' }
  | { type: 'dismissTieBreak' }

export function scoreDetailReducer(state: ScoreDetailState, action: ScoreDetailAction): ScoreDetailState {
  switch (action.type) {
    case 'updateScore': {
      const rounds = state.rounds.slice()
      rounds[action.roundIndex] = { ...rounds[action.roundIndex], [action.playerId]: action.value }
      return { ...state, rounds, error: undefined }
    }
    case 'addRound':
      return { ...state, rounds: [...state.rounds, {}], error: undefined }
    case 'removeRound': {
      if (state.rounds.length <= 1 || action.index < 0 || action.index >= state.rounds.length) return state
      const rounds = state.rounds.slice()
      rounds.splice(action.index, 1)
      return { ...state, rounds }
    }
    case 'cancelImmediate':
      return { ...state, cancelled: true }
    case 'showCancelConfirm':
      return { ...state, showCancelConfirm: true }
    case 'confirmCancel':
      return { ...state, cancelled: true, showCancelConfirm: false }
    case 'dismissCancelConfirm':
      return { ...state, showCancelConfirm: false }
    case 'validationFailed':
      return { ...state, error: action.error }
    case 'openWinnerModal':
      return { ...state, showWinnerModal: true, modalWinners: new Set(), error: undefined }
    case 'openManualSelectionDialog':
      return {
        ...state,
        showManualSelectionDialog: true,
        tiedPlayerIds: action.tiedPlayerIds,
        manualSelectionWinners: new Set(),
        error: undefined,
      }
    case 'openSecondaryScoreDialog':
      return {
        ...state,
        showSecondaryScoreDialog: true,
        tiedPlayerIds: action.tiedPlayerIds,
        secondaryScoreInputs: Object.fromEntries(action.tiedPlayerIds.map((id) => [id, ''])),
        error: undefined,
      }
    case 'saved':
      return { ...state, saved: true }
    case 'saveFailed':
      return { ...state, error: action.error }
    case 'dismissModal':
      return { ...state, showWinnerModal: false, error: undefined }
    case 'toggleModalWinner': {
      const winners = new Set(state.modalWinners)
      if (winners.has(action.playerId)) winners.delete(action.playerId)
      else winners.add(action.playerId)
      return { ...state, modalWinners: winners, error: undefined }
    }
    case 'confirmWinnersEmptyError':
      return { ...state, error: 'Select at least one winner' }
    case 'updateSecondaryScoreInput':
      return {
        ...state,
        secondaryScoreInputs: { ...state.secondaryScoreInputs, [action.playerId]: action.value },
        error: undefined,
      }
    case 'secondaryScoreInvalid':
      return { ...state, error: 'Invalid secondary score for one of the tied players' }
    case 'secondaryScoreEscalate':
      return {
        ...state,
        showSecondaryScoreDialog: false,
        showManualSelectionDialog: true,
        manualSelectionWinners: new Set(),
        collectedSecondaryScores: action.collectedSecondaryScores,
        error: undefined,
      }
    case 'toggleManualSelectionWinner': {
      const winners = new Set(state.manualSelectionWinners)
      if (winners.has(action.playerId)) winners.delete(action.playerId)
      else winners.add(action.playerId)
      return { ...state, manualSelectionWinners: winners, error: undefined }
    }
    case 'manualWinnersEmptyError':
      return { ...state, error: 'Select at least one winner' }
    case 'dismissTieBreak':
      return { ...state, showSecondaryScoreDialog: false, showManualSelectionDialog: false, error: undefined }
  }
}

function performSave(
  deps: ScoreDetailDeps,
  gameType: GameType,
  playerScores: PlayerScore[],
  manualWinners: string[] = [],
  secondaryPlayerScores: PlayerScore[] = [],
): ScoreDetailAction {
  try {
    if (deps.mode.type === 'Edit') {
      const original = deps.mode.matchRepository.findById(deps.mode.matchId)
      if (!original) return { type: 'saveFailed', error: 'Could not find original match to update' }
      const updated: Match = { ...original, playerScores, manualWinners, secondaryPlayerScores }
      deps.mode.updateMatchUseCase.invoke(updated)
      deps.matchDraftRepository?.clear()
      return { type: 'saved' }
    }
    const result = deps.createMatch.invoke(gameType.id, playerScores, deps.currentDate(), {
      manualWinners,
      secondaryPlayerScores,
    })
    if (result.ok) {
      deps.matchDraftRepository?.clear()
      return { type: 'saved' }
    }
    return { type: 'saveFailed', error: result.error.message }
  } catch (e) {
    return { type: 'saveFailed', error: `Failed to save match: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** Mirrors ScoreDetailHandler's Terminate: validates, then routes to a modal or straight to save. */
export function submitTerminate(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  const validation = validateRounds(state)
  if (!validation.ok) return { type: 'validationFailed', error: validation.error }

  if (state.gameType.winCondition === 'MANUAL') {
    return { type: 'openWinnerModal' }
  }

  const playerScores = playerScoresFromTotals(state)
  const primaryWinners = computeWinners(state.gameType, playerScores)

  if (primaryWinners.length <= 1) {
    return performSave(deps, state.gameType, playerScores, [])
  }
  if (state.gameType.tieBreakRule === 'NONE') {
    return performSave(deps, state.gameType, playerScores, primaryWinners)
  }
  if (state.gameType.tieBreakRule === 'MANUAL_SELECTION') {
    return { type: 'openManualSelectionDialog', tiedPlayerIds: primaryWinners }
  }
  return { type: 'openSecondaryScoreDialog', tiedPlayerIds: primaryWinners }
}

export function submitConfirmWinners(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  if (state.modalWinners.size === 0) return { type: 'confirmWinnersEmptyError' }
  return performSave(deps, state.gameType, playerScoresFromTotals(state), [...state.modalWinners])
}

export function submitSecondaryScores(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  const secondaryScores: PlayerScore[] = []
  for (const playerId of state.tiedPlayerIds) {
    const input = (state.secondaryScoreInputs[playerId] ?? '').trim()
    const score = toIntOrNull(input)
    if (score === null) return { type: 'secondaryScoreInvalid' }
    secondaryScores.push({ playerId, score })
  }

  const secondaryWinners = computeWinners(state.gameType, secondaryScores, state.gameType.tieBreakCondition)
  const resolvedWinners = secondaryWinners.filter((id) => state.tiedPlayerIds.includes(id))

  if (resolvedWinners.length < state.tiedPlayerIds.length) {
    return performSave(deps, state.gameType, playerScoresFromTotals(state), resolvedWinners, secondaryScores)
  }
  return { type: 'secondaryScoreEscalate', collectedSecondaryScores: secondaryScores }
}

export function submitConfirmManualWinners(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  if (state.manualSelectionWinners.size === 0) return { type: 'manualWinnersEmptyError' }
  return performSave(
    deps,
    state.gameType,
    playerScoresFromTotals(state),
    [...state.manualSelectionWinners],
    state.collectedSecondaryScores,
  )
}

export function submitKeepTie(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  return performSave(
    deps,
    state.gameType,
    playerScoresFromTotals(state),
    state.tiedPlayerIds,
    state.collectedSecondaryScores,
  )
}

/** Mirrors ScoreDetailHandler's CancelMatch: shows a confirmation only if any score was entered. */
export function submitCancelMatch(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  if (hasUnsavedScores(state.rounds)) {
    return { type: 'showCancelConfirm' }
  }
  deps.matchDraftRepository?.clear()
  return { type: 'cancelImmediate' }
}

export function submitConfirmCancel(deps: ScoreDetailDeps): ScoreDetailAction {
  deps.matchDraftRepository?.clear()
  return { type: 'confirmCancel' }
}

/** Mirrors ScoreDetailHandler's saveDraft(), called after every rounds-changing action. */
export function saveDraft(
  deps: ScoreDetailDeps,
  gameType: GameType,
  players: Player[],
  rounds: Record<string, string>[],
): void {
  if (!deps.matchDraftRepository) return
  deps.matchDraftRepository.save({
    gameTypeId: gameType.id,
    playerIds: players.map((p) => p.id),
    rounds,
    updatedAt: Date.now(),
  })
}

function reconstructRounds(match: Match): Record<string, string>[] {
  const round: Record<string, string> = {}
  for (const ps of match.playerScores) {
    round[ps.playerId] = String(ps.score)
  }
  return [round]
}

function freshState(gameType: GameType, players: Player[]): ScoreDetailState {
  return {
    gameType,
    players,
    rounds: [{}],
    showWinnerModal: false,
    modalWinners: new Set(),
    error: undefined,
    saved: false,
    cancelled: false,
    showSecondaryScoreDialog: false,
    tiedPlayerIds: [],
    secondaryScoreInputs: {},
    showManualSelectionDialog: false,
    manualSelectionWinners: new Set(),
    collectedSecondaryScores: [],
    editingMatchId: undefined,
    showCancelConfirm: false,
  }
}

/** Mirrors ScoreDetailHandler.reset(): fresh state (ignores any draft/edit mode) + clears the draft. */
export function resetState(gameType: GameType, players: Player[], deps: ScoreDetailDeps): ScoreDetailState {
  deps.matchDraftRepository?.clear()
  return freshState(gameType, players)
}

/** Mirrors ScoreDetailHandler's init block: loads an existing match for editing, or restores a matching draft. */
export function buildInitialState(
  gameType: GameType,
  players: Player[],
  mode: ScoreDetailMode,
  matchDraftRepository?: MatchDraftRepository,
): ScoreDetailState {
  const base = freshState(gameType, players)

  if (mode.type === 'Edit') {
    const match = mode.matchRepository.findById(mode.matchId)
    if (!match) return base
    const editGameType = mode.gameTypeRepository.findById(match.gameTypeId)
    if (!editGameType) return base
    const matchPlayerIds = new Set(match.playerScores.map((ps) => ps.playerId))
    const editPlayers = mode.playerRepository.getAll(true).filter((p) => matchPlayerIds.has(p.id))
    return {
      ...base,
      gameType: editGameType,
      players: editPlayers,
      rounds: reconstructRounds(match),
      editingMatchId: mode.matchId,
    }
  }

  const draft = matchDraftRepository?.load()
  if (!draft) return base
  if (draft.gameTypeId !== gameType.id) return base
  const draftIds = new Set(draft.playerIds)
  const playerIds = new Set(players.map((p) => p.id))
  if (draftIds.size !== playerIds.size || [...draftIds].some((id) => !playerIds.has(id))) return base
  return { ...base, rounds: draft.rounds }
}
