import { describe, expect, it } from 'vitest'
import { EMPTY_HAND } from '../../domain/hand'
import {
  buildEditingState,
  buildInitialState,
  flip7ModuleReducer,
  handOf,
  isFinished,
  isInTieBreak,
  toDraft,
} from './flip7ModuleReducer'
import type { Flip7Action, Flip7State } from './flip7ModuleTypes'

const PLAYERS = ['a', 'b']

const run = (state: Flip7State, ...actions: Flip7Action[]) =>
  actions.reduce(flip7ModuleReducer, state)

const fresh = () => buildInitialState(PLAYERS, undefined)

/** Plays `count` rounds where `a` and `b` keep the given Number cards. */
function playRounds(state: Flip7State, count: number, a: number[], b: number[]): Flip7State {
  let next = state
  for (let i = 0; i < count; i++) {
    next = run(
      next,
      ...a.map((value): Flip7Action => ({ type: 'toggleNumber', playerId: 'a', value })),
      ...b.map((value): Flip7Action => ({ type: 'toggleNumber', playerId: 'b', value })),
      { type: 'submitRound' },
    )
  }
  return next
}

describe('flip7ModuleReducer', () => {
  it('starts with no round and empty hands', () => {
    const state = fresh()
    expect(state.rounds).toEqual([])
    expect(handOf(state, 'a')).toEqual(EMPTY_HAND)
  })

  it('toggles Number cards on and off, kept sorted', () => {
    const state = run(
      fresh(),
      { type: 'toggleNumber', playerId: 'a', value: 9 },
      { type: 'toggleNumber', playerId: 'a', value: 2 },
      { type: 'toggleNumber', playerId: 'a', value: 5 },
      { type: 'toggleNumber', playerId: 'a', value: 9 },
    )
    expect(handOf(state, 'a').numbers).toEqual([2, 5])
  })

  it('refuses an eighth different Number card', () => {
    let state = fresh()
    for (const value of [0, 1, 2, 3, 4, 5, 6, 7]) {
      state = run(state, { type: 'toggleNumber', playerId: 'a', value })
    }
    expect(handOf(state, 'a').numbers).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('toggles modifiers, the ×2 and a bust', () => {
    const state = run(
      fresh(),
      { type: 'toggleModifier', playerId: 'b', value: 4 },
      { type: 'toggleDoubled', playerId: 'b' },
      { type: 'toggleBusted', playerId: 'b' },
    )
    expect(handOf(state, 'b')).toEqual({ busted: true, numbers: [], modifiers: [4], doubled: true })
  })

  it('ignores a player who is not at the table', () => {
    const state = fresh()
    expect(run(state, { type: 'toggleNumber', playerId: 'zz', value: 3 })).toBe(state)
  })

  it('records every player in a submitted round and clears the hands', () => {
    const state = run(
      fresh(),
      { type: 'toggleNumber', playerId: 'a', value: 8 },
      { type: 'submitRound' },
    )
    expect(state.rounds).toEqual([
      {
        entries: [
          { playerId: 'a', hand: { ...EMPTY_HAND, numbers: [8] } },
          { playerId: 'b', hand: EMPTY_HAND },
        ],
      },
    ])
    expect(state.hands).toEqual({})
  })

  it('undoes the last round', () => {
    const state = run(fresh(), { type: 'submitRound' }, { type: 'undoLastRound' })
    expect(state.rounds).toEqual([])
    expect(run(state, { type: 'undoLastRound' })).toBe(state)
  })

  it('finishes once a sole leader reaches 200, and refuses further rounds', () => {
    const eight = playRounds(fresh(), 8, [12, 11], []) // 184
    expect(isFinished(eight)).toBe(false)
    const nine = playRounds(eight, 1, [12, 11], []) // 207
    expect(isFinished(nine)).toBe(true)
    expect(run(nine, { type: 'submitRound' })).toBe(nine)
  })

  it('plays a tie-break when the lead is shared past 200', () => {
    const tied = playRounds(fresh(), 9, [12, 11], [12, 11]) // 207 / 207
    expect(isFinished(tied)).toBe(false)
    expect(isInTieBreak(tied)).toBe(true)
    expect(isFinished(playRounds(tied, 1, [1], []))).toBe(true)
  })

  it('opens and dismisses the abandon confirmation', () => {
    const open = run(fresh(), { type: 'showAbandonConfirm' })
    expect(open.confirmAbandon).toBe(true)
    expect(run(open, { type: 'dismissAbandonConfirm' }).confirmAbandon).toBe(false)
  })
})

describe('draft and reopening', () => {
  it('round-trips a draft through JSON, hand in progress included', () => {
    const state = run(
      fresh(),
      { type: 'toggleNumber', playerId: 'a', value: 3 },
      { type: 'submitRound' },
      { type: 'toggleModifier', playerId: 'b', value: 10 },
    )
    const restored = buildInitialState(PLAYERS, JSON.parse(JSON.stringify(toDraft(state))))
    expect(restored.rounds).toEqual(state.rounds)
    expect(handOf(restored, 'b').modifiers).toEqual([10])
  })

  it('reopens a saved match from its moduleData, keeping the stored seating', () => {
    const state = run(
      fresh(),
      { type: 'toggleNumber', playerId: 'b', value: 3 },
      { type: 'submitRound' },
    )
    const data = JSON.parse(JSON.stringify({ players: PLAYERS, rounds: state.rounds }))
    // The host hands players back in ranking order: b won, so b comes first.
    const reopened = buildEditingState(['b', 'a'], data)
    expect(reopened.playerIds).toEqual(PLAYERS)
    expect(reopened.rounds).toEqual(state.rounds)
  })

  it('reopens a clean game for another table or an unreadable payload', () => {
    expect(buildEditingState(['a', 'c'], { players: PLAYERS, rounds: [] }).playerIds).toEqual([
      'a',
      'c',
    ])
    expect(buildEditingState(PLAYERS, { nope: true }).rounds).toEqual([])
  })

  it('starts clean on a draft for another table, another version or with a corrupt hand', () => {
    const draft = toDraft(run(fresh(), { type: 'submitRound' }))
    expect(buildInitialState(PLAYERS, draft).rounds).toHaveLength(1)
    expect(buildInitialState(['a', 'c'], draft).rounds).toEqual([])
    expect(buildInitialState(PLAYERS, { ...draft, version: 99 }).rounds).toEqual([])
    expect(
      buildInitialState(PLAYERS, {
        ...draft,
        hands: { a: { busted: false, numbers: [4, 4], modifiers: [], doubled: false } },
      }).rounds,
    ).toEqual([])
  })

  it('takes back the round that ended the game, and plays on', () => {
    const over = playRounds(fresh(), 9, [12, 11], []) // 207
    const back = run(over, { type: 'undoLastRound' })
    expect(isFinished(back)).toBe(false)
    expect(playRounds(back, 1, [1], []).rounds).toHaveLength(9)
  })
})
