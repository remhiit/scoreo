import { computeWinners, type GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'
import type { PlayerScore } from '../../domain/model/playerScore'
import type { MatchDraftRepository } from '../../domain/port/matchDraftRepository'
import type { CreateMatchUseCase } from '../../application/createMatchUseCase'
import type { ScoreDetailMode, ScoreDetailState, ScoreDetailViewMode } from './scoreDetailTypes'

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

/** YYYY-MM-DD calendar date in the user's local timezone (Match.date itself stays an epoch ms, timezone-agnostic). */
export function toDateOnly(epochMs: number): string {
  const d = new Date(epochMs)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isFutureDate(dateStr: string, currentEpochMs: number): boolean {
  return dateStr > toDateOnly(currentEpochMs)
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Rejects empty strings and calendar-invalid dates (e.g. 2026-02-30), not just malformed ones. */
function isValidDateOnly(dateStr: string): boolean {
  if (!DATE_ONLY_PATTERN.test(dateStr)) return false
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

/** Combines a YYYY-MM-DD calendar date (local) with the local time-of-day taken from a reference epoch timestamp. */
function combineDateWithTimeOfDay(dateStr: string, referenceEpochMs: number): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const ref = new Date(referenceEpochMs)
  return new Date(year, month - 1, day, ref.getHours(), ref.getMinutes(), ref.getSeconds(), ref.getMilliseconds()).getTime()
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

/** Converts the played rounds (skipping the trailing not-yet-played one) into Match.rounds' PlayerScore[][] shape. */
function roundsForSave(state: ScoreDetailState): PlayerScore[][] {
  return state.rounds
    .filter((round) => Object.values(round).some((v) => v.trim() !== ''))
    .map((round) =>
      state.players.map((p) => {
        const raw = round[p.id]
        const parsed = raw !== undefined ? toIntOrNull(raw.trim()) : null
        return { playerId: p.id, score: parsed ?? 0 }
      }),
    )
}

export interface StandingRow {
  playerId: string
  playerName: string
  rank: number
  total: number
  delta: number
  isLead: boolean
}

function lastRoundDeltas(players: Player[], rounds: Record<string, string>[]): Map<string, number> {
  const deltas = new Map<string, number>()
  const lastRound = rounds[rounds.length - 1]
  for (const player of players) {
    const raw = lastRound?.[player.id]
    const parsed = raw !== undefined ? toIntOrNull(raw.trim()) : null
    deltas.set(player.id, parsed ?? 0)
  }
  return deltas
}

/** Ranks players by gameType.winCondition (LOWEST_SCORE ascending, otherwise descending); tied totals share a rank. */
export function computeStandings(
  gameType: GameType,
  players: Player[],
  rounds: Record<string, string>[],
): StandingRow[] {
  const totals = computeTotals(players, rounds)
  const deltas = lastRoundDeltas(players, rounds)
  const ascending = gameType.winCondition === 'LOWEST_SCORE'
  const sorted = [...players].sort((a, b) => {
    const diff = (totals.get(a.id) ?? 0) - (totals.get(b.id) ?? 0)
    return ascending ? diff : -diff
  })

  const rows: StandingRow[] = []
  let rank = 0
  let previousTotal: number | undefined
  sorted.forEach((player, index) => {
    const total = totals.get(player.id) ?? 0
    if (previousTotal === undefined || total !== previousTotal) rank = index + 1
    previousTotal = total
    rows.push({
      playerId: player.id,
      playerName: player.name,
      rank,
      total,
      delta: deltas.get(player.id) ?? 0,
      isLead: rank === 1,
    })
  })
  return rows
}

/** A round only counts as "played" once at least one player has a non-empty cell in it. */
export function countRoundsPlayed(rounds: Record<string, string>[]): number {
  return rounds.filter((round) => Object.values(round).some((v) => v.trim() !== '')).length
}

/** The round the entry sheet should fill next: the first not-yet-played round, or a new one past the end. */
export function nextRoundNumber(rounds: Record<string, string>[]): number {
  return countRoundsPlayed(rounds) + 1
}

export function leadHintLabel(gameType: GameType, roundsPlayed: number): string {
  const direction = gameType.winCondition === 'LOWEST_SCORE' ? 'lowest score leads' : 'highest score leads'
  if (roundsPlayed === 0) return `No rounds played yet · ${direction}`
  const roundWord = roundsPlayed === 1 ? 'round' : 'rounds'
  return `After ${roundsPlayed} ${roundWord} · ${direction}`
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
  | { type: 'setViewMode'; mode: ScoreDetailViewMode }
  | { type: 'updateMatchDate'; value: string }
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
  | { type: 'openRoundSheet' }
  | { type: 'closeRoundSheet' }
  | { type: 'updateRoundSheetInput'; playerId: string; value: number }
  | { type: 'submitRoundSheet' }

export function scoreDetailReducer(state: ScoreDetailState, action: ScoreDetailAction): ScoreDetailState {
  switch (action.type) {
    case 'setViewMode':
      return { ...state, viewMode: action.mode }
    case 'updateMatchDate':
      return { ...state, matchDate: action.value, error: undefined }
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
    case 'openRoundSheet':
      return {
        ...state,
        showRoundSheet: true,
        roundSheetInputs: Object.fromEntries(state.players.map((p) => [p.id, 0])),
        error: undefined,
      }
    case 'closeRoundSheet':
      return { ...state, showRoundSheet: false, roundSheetInputs: {} }
    case 'updateRoundSheetInput':
      return {
        ...state,
        roundSheetInputs: { ...state.roundSheetInputs, [action.playerId]: action.value },
      }
    case 'submitRoundSheet': {
      const round = Object.fromEntries(
        state.players.map((p) => [p.id, String(state.roundSheetInputs[p.id] ?? 0)]),
      )
      const rounds = state.rounds.slice()
      const index = countRoundsPlayed(rounds)
      if (index < rounds.length) rounds[index] = round
      else rounds.push(round)
      return { ...state, rounds, showRoundSheet: false, roundSheetInputs: {}, error: undefined }
    }
  }
}

function performSave(
  deps: ScoreDetailDeps,
  state: ScoreDetailState,
  playerScores: PlayerScore[],
  manualWinners: string[] = [],
  secondaryPlayerScores: PlayerScore[] = [],
): ScoreDetailAction {
  const rounds = roundsForSave(state)
  try {
    if (deps.mode.type === 'Edit') {
      const original = deps.mode.matchRepository.findById(deps.mode.matchId)
      if (!original) return { type: 'saveFailed', error: 'Could not find original match to update' }
      const date = combineDateWithTimeOfDay(state.matchDate, original.date)
      const updated: Match = { ...original, date, playerScores, manualWinners, secondaryPlayerScores, rounds }
      deps.mode.updateMatchUseCase.invoke(updated)
      deps.matchDraftRepository?.clear()
      return { type: 'saved' }
    }
    const date = combineDateWithTimeOfDay(state.matchDate, deps.currentDate())
    const result = deps.createMatch.invoke(state.gameType.id, playerScores, date, {
      manualWinners,
      secondaryPlayerScores,
      rounds,
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
  if (!isValidDateOnly(state.matchDate)) {
    return { type: 'validationFailed', error: 'Match date is required' }
  }
  if (isFutureDate(state.matchDate, deps.currentDate())) {
    return { type: 'validationFailed', error: 'Match date cannot be in the future' }
  }
  const validation = validateRounds(state)
  if (!validation.ok) return { type: 'validationFailed', error: validation.error }

  if (state.gameType.winCondition === 'MANUAL') {
    return { type: 'openWinnerModal' }
  }

  const playerScores = playerScoresFromTotals(state)
  const primaryWinners = computeWinners(state.gameType, playerScores)

  if (primaryWinners.length <= 1) {
    return performSave(deps, state, playerScores, [])
  }
  if (state.gameType.tieBreakRule === 'NONE') {
    return performSave(deps, state, playerScores, primaryWinners)
  }
  if (state.gameType.tieBreakRule === 'MANUAL_SELECTION') {
    return { type: 'openManualSelectionDialog', tiedPlayerIds: primaryWinners }
  }
  return { type: 'openSecondaryScoreDialog', tiedPlayerIds: primaryWinners }
}

export function submitConfirmWinners(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  if (state.modalWinners.size === 0) return { type: 'confirmWinnersEmptyError' }
  return performSave(deps, state, playerScoresFromTotals(state), [...state.modalWinners])
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
    return performSave(deps, state, playerScoresFromTotals(state), resolvedWinners, secondaryScores)
  }
  return { type: 'secondaryScoreEscalate', collectedSecondaryScores: secondaryScores }
}

export function submitConfirmManualWinners(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  if (state.manualSelectionWinners.size === 0) return { type: 'manualWinnersEmptyError' }
  return performSave(
    deps,
    state,
    playerScoresFromTotals(state),
    [...state.manualSelectionWinners],
    state.collectedSecondaryScores,
  )
}

export function submitKeepTie(state: ScoreDetailState, deps: ScoreDetailDeps): ScoreDetailAction {
  return performSave(
    deps,
    state,
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

/**
 * Stored rounds are only trusted when every round entry names a participant of
 * the match and the per-player sums match the recorded totals. A mismatch means
 * the detail and the totals disagree (partial sync, match written by an older
 * build): rebuilding from it would silently change the match's scores.
 */
function roundsAgreeWithTotals(match: Match): boolean {
  const totals = new Map(match.playerScores.map((ps) => [ps.playerId, ps.score]))
  const sums = new Map<string, number>()
  for (const round of match.rounds) {
    for (const ps of round) {
      if (!totals.has(ps.playerId)) return false
      sums.set(ps.playerId, (sums.get(ps.playerId) ?? 0) + ps.score)
    }
  }
  return match.playerScores.every((ps) => (sums.get(ps.playerId) ?? 0) === ps.score)
}

/**
 * Rebuilds the editor's round grid from the match's stored per-round detail, so
 * editing an existing match keeps its rounds instead of flattening them into a
 * single round of totals on the next save. Falls back to that single round when
 * no detail was stored (matches saved before `Match.rounds` existed, or
 * imported) or when the stored detail disagrees with the totals.
 */
function reconstructRounds(match: Match): Record<string, string>[] {
  if (match.rounds.length > 0 && roundsAgreeWithTotals(match)) {
    return match.rounds.map((round) => Object.fromEntries(round.map((ps) => [ps.playerId, String(ps.score)])))
  }
  const round: Record<string, string> = {}
  for (const ps of match.playerScores) {
    round[ps.playerId] = String(ps.score)
  }
  return [round]
}

function freshState(gameType: GameType, players: Player[], currentDateEpochMs: number): ScoreDetailState {
  return {
    gameType,
    players,
    rounds: [{}],
    matchDate: toDateOnly(currentDateEpochMs),
    viewMode: 'standings',
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
    showRoundSheet: false,
    roundSheetInputs: {},
  }
}

/** Mirrors ScoreDetailHandler.reset(): fresh state (ignores any draft/edit mode) + clears the draft. */
export function resetState(gameType: GameType, players: Player[], deps: ScoreDetailDeps): ScoreDetailState {
  deps.matchDraftRepository?.clear()
  return freshState(gameType, players, deps.currentDate())
}

/** Mirrors ScoreDetailHandler's init block: loads an existing match for editing, or restores a matching draft. */
export function buildInitialState(
  gameType: GameType,
  players: Player[],
  mode: ScoreDetailMode,
  currentDate: () => number,
  matchDraftRepository?: MatchDraftRepository,
): ScoreDetailState {
  const base = freshState(gameType, players, currentDate())

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
      matchDate: toDateOnly(match.date),
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
