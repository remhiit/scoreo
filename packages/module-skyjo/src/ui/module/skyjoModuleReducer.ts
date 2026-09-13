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

function sameTable(restored: readonly string[], playerIds: readonly string[]): boolean {
  return (
    restored.length === playerIds.length && restored.every((id, index) => id === playerIds[index])
  )
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
): Pick<SkyjoDraft, 'rounds' | 'enderPlayerId' | 'scoreInputs'> | undefined {
  const draft = SkyjoDraftSchema.safeParse(data)
  if (draft.success && sameTable(draft.data.players, playerIds)) {
    return {
      rounds: draft.data.rounds,
      enderPlayerId: draft.data.enderPlayerId,
      scoreInputs: draft.data.scoreInputs,
    }
  }

  // A reopened, already-finished match carries only the round log — no round
  // was in progress when it was saved.
  const saved = SkyjoModuleDataSchema.safeParse(data)
  if (saved.success && sameTable(saved.data.players, playerIds)) {
    return { rounds: saved.data.rounds, enderPlayerId: undefined, scoreInputs: {} }
  }

  return undefined
}

export function buildInitialState(playerIds: readonly string[], charge: unknown): SkyjoState {
  const restored = readCharge(charge, playerIds)
  return {
    playerIds: [...playerIds],
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
