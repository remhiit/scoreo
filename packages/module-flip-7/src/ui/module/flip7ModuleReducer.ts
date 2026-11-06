import { EMPTY_HAND, FLIP_7_COUNT, toPlainHand, type Flip7Hand } from '../../domain/hand'
import { Flip7ModuleDataSchema } from '../../domain/moduleResult'
import { isGameOver, isTieBreak, toPlainRounds } from '../../domain/round'
import {
  DRAFT_VERSION,
  Flip7DraftSchema,
  type Flip7Action,
  type Flip7Draft,
  type Flip7State,
} from './flip7ModuleTypes'

export function handOf(state: Flip7State, playerId: string): Flip7Hand {
  return state.hands[playerId] ?? EMPTY_HAND
}

function sameTable(restored: readonly string[], playerIds: readonly string[]): boolean {
  return (
    restored.length === playerIds.length && restored.every((id, index) => id === playerIds[index])
  )
}

function sameSet(restored: readonly string[], playerIds: readonly string[]): boolean {
  return restored.length === playerIds.length && playerIds.every((id) => restored.includes(id))
}

/**
 * A new game, resumed from the host's draft when there is one. The draft is
 * never trusted: anything the schema rejects (another `DRAFT_VERSION`, a
 * corrupt hand, a truncated write) or that was written for a different table
 * starts a clean game rather than crediting today's players with someone
 * else's rounds.
 */
export function buildInitialState(playerIds: readonly string[], draft: unknown): Flip7State {
  const parsed = Flip7DraftSchema.safeParse(draft)
  const restored =
    parsed.success && sameTable(parsed.data.players, playerIds) ? parsed.data : undefined
  return {
    playerIds: [...playerIds],
    rounds: restored?.rounds ?? [],
    hands: restored?.hands ?? {},
    confirmAbandon: false,
  }
}

/**
 * A stored match being reopened, from its `moduleData`. The host hands the
 * players back in ranking order (`playerScores`), not in the order they sat
 * down, so the table is matched as a set and the stored order is kept — the
 * columns stay where they were. A payload for other players, or one the
 * schema rejects, opens a clean game for the players the host named.
 */
export function buildEditingState(playerIds: readonly string[], data: unknown): Flip7State {
  const saved = Flip7ModuleDataSchema.safeParse(data)
  if (!saved.success || !sameSet(saved.data.players, playerIds)) {
    return buildInitialState(playerIds, undefined)
  }
  return {
    playerIds: [...saved.data.players],
    rounds: saved.data.rounds,
    hands: {},
    confirmAbandon: false,
  }
}

export function toDraft(state: Flip7State): Flip7Draft {
  return {
    version: DRAFT_VERSION,
    players: [...state.playerIds],
    rounds: toPlainRounds(state.rounds),
    hands: Object.fromEntries(
      Object.entries(state.hands).map(([playerId, hand]) => [playerId, toPlainHand(hand)]),
    ),
  }
}

export function isFinished(state: Flip7State): boolean {
  return isGameOver(state.playerIds, state.rounds)
}

export function isInTieBreak(state: Flip7State): boolean {
  return isTieBreak(state.playerIds, state.rounds)
}

function toggle(values: readonly number[], value: number): number[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value].sort((a, b) => a - b)
}

function withHand(state: Flip7State, playerId: string, hand: Flip7Hand): Flip7State {
  if (!state.playerIds.includes(playerId)) return state
  return { ...state, hands: { ...state.hands, [playerId]: hand } }
}

export function flip7ModuleReducer(state: Flip7State, action: Flip7Action): Flip7State {
  switch (action.type) {
    case 'toggleNumber': {
      const hand = handOf(state, action.playerId)
      const adding = !hand.numbers.includes(action.value)
      // An eighth different Number card cannot exist: the seventh ends the round.
      if (adding && hand.numbers.length >= FLIP_7_COUNT) return state
      return withHand(state, action.playerId, {
        ...hand,
        numbers: toggle(hand.numbers, action.value),
      })
    }

    case 'toggleModifier': {
      const hand = handOf(state, action.playerId)
      return withHand(state, action.playerId, {
        ...hand,
        modifiers: toggle(hand.modifiers, action.value),
      })
    }

    case 'toggleDoubled': {
      const hand = handOf(state, action.playerId)
      return withHand(state, action.playerId, { ...hand, doubled: !hand.doubled })
    }

    case 'toggleBusted': {
      const hand = handOf(state, action.playerId)
      return withHand(state, action.playerId, { ...hand, busted: !hand.busted })
    }

    case 'submitRound':
      if (isFinished(state)) return state
      return {
        ...state,
        rounds: [
          ...state.rounds,
          {
            entries: state.playerIds.map((playerId) => ({
              playerId,
              hand: handOf(state, playerId),
            })),
          },
        ],
        hands: {},
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
