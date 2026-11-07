import { SkyjoModuleDataSchema } from '../../domain/moduleResult'
import { isGameOver, toPlainRounds, type SkyjoRoundEntry } from '../../domain/round'
import {
  SkyjoDraftSchema,
  DRAFT_VERSION,
  type SkyjoAction,
  type SkyjoDraft,
  type SkyjoState,
} from './skyjoModuleTypes'

/** Matches how every other module parses a typed score: digits only, an optional leading minus. */
function parseScore(value: string): number | undefined {
  return /^-?\d+$/.test(value) ? Number(value) : undefined
}

/**
 * The round currently being entered, or `undefined` while any player's field
 * is missing or unparsable — the boundary check both `canSubmitRound` and
 * `submitRound` share, so the two can never disagree about readiness.
 */
function pendingEntries(state: SkyjoState): readonly SkyjoRoundEntry[] | undefined {
  const entries: SkyjoRoundEntry[] = []
  for (const playerId of state.playerIds) {
    const rawScore = parseScore(state.scoreInputs[playerId] ?? '')
    if (rawScore === undefined) return undefined
    entries.push({ playerId, rawScore })
  }
  return entries
}

export function canSubmitRound(state: SkyjoState): boolean {
  return state.enderPlayerId !== undefined && pendingEntries(state) !== undefined
}

/**
 * Where a persisted payload comes from, which decides how strictly its table
 * is checked against the players the host handed over:
 *
 * - `'draft'` — a new game resumed from `host.loadDraft()`. The host passes the
 *   ids in the order the players were picked, the same order the draft was
 *   written with, so anything else is someone else's game.
 * - `'match'` — a saved match reopened through `editing`. The host passes
 *   `Match.playerScores` ids, which are in *ranking* order, not seating order,
 *   so only the set of players is compared and the payload's own order wins.
 */
export type ChargeSource = 'draft' | 'match'

function sameSeating(restored: readonly string[], playerIds: readonly string[]): boolean {
  return (
    restored.length === playerIds.length && restored.every((id, index) => id === playerIds[index])
  )
}

function samePlayers(restored: readonly string[], playerIds: readonly string[]): boolean {
  const atTable = new Set(playerIds)
  return (
    restored.length === playerIds.length &&
    new Set(restored).size === restored.length &&
    restored.every((id) => atTable.has(id))
  )
}

interface Restored extends Pick<SkyjoDraft, 'rounds' | 'enderPlayerId' | 'scoreInputs'> {
  /** The seating the payload was recorded with — the column order to show. */
  readonly players: readonly string[]
}

/**
 * Reads a persisted payload — a draft, or the `moduleData` of a match being
 * reopened — without ever trusting it: it may have been written by an older
 * version of this module, hand-edited, or truncated by a browser that ran out
 * of quota. Anything the schema rejects, or that was written for a different
 * table, starts a clean game rather than crediting today's players with
 * someone else's rounds.
 */
function readCharge(
  data: unknown,
  playerIds: readonly string[],
  source: ChargeSource,
): Restored | undefined {
  const sameTable = source === 'match' ? samePlayers : sameSeating

  const draft = SkyjoDraftSchema.safeParse(data)
  if (draft.success && sameTable(draft.data.players, playerIds)) {
    return {
      players: draft.data.players,
      rounds: draft.data.rounds,
      enderPlayerId: draft.data.enderPlayerId,
      scoreInputs: draft.data.scoreInputs,
    }
  }

  // A reopened, already-finished match carries only the round log — no round
  // was in progress when it was saved.
  const saved = SkyjoModuleDataSchema.safeParse(data)
  if (saved.success && sameTable(saved.data.players, playerIds)) {
    return {
      players: saved.data.players,
      rounds: saved.data.rounds,
      enderPlayerId: undefined,
      scoreInputs: {},
    }
  }

  return undefined
}

export function buildInitialState(
  playerIds: readonly string[],
  charge: unknown,
  source: ChargeSource = 'draft',
): SkyjoState {
  const restored = readCharge(charge, playerIds, source)
  return {
    playerIds: [...(restored?.players ?? playerIds)],
    rounds: restored?.rounds ?? [],
    enderPlayerId: restored?.enderPlayerId,
    scoreInputs: restored?.scoreInputs ?? {},
    confirmAbandon: false,
  }
}

export function toDraft(state: SkyjoState): SkyjoDraft {
  return {
    version: DRAFT_VERSION,
    players: [...state.playerIds],
    rounds: toPlainRounds(state.rounds),
    enderPlayerId: state.enderPlayerId,
    scoreInputs: { ...state.scoreInputs },
  }
}

export function isFinished(state: SkyjoState): boolean {
  return isGameOver(state.playerIds, state.rounds)
}

export function skyjoModuleReducer(state: SkyjoState, action: SkyjoAction): SkyjoState {
  switch (action.type) {
    case 'selectEnder':
      return { ...state, enderPlayerId: action.playerId }

    case 'updateScoreInput':
      return { ...state, scoreInputs: { ...state.scoreInputs, [action.playerId]: action.value } }

    case 'submitRound': {
      const entries = pendingEntries(state)
      if (state.enderPlayerId === undefined || entries === undefined) return state
      return {
        ...state,
        rounds: [...state.rounds, { enderPlayerId: state.enderPlayerId, entries }],
        enderPlayerId: undefined,
        scoreInputs: {},
      }
    }

    case 'undoLastRound':
      if (state.rounds.length === 0) return state
      return { ...state, rounds: state.rounds.slice(0, -1) }

    case 'showAbandonConfirm':
      return { ...state, confirmAbandon: true }

    case 'dismissAbandonConfirm':
      return { ...state, confirmAbandon: false }
  }
}
