import { describe, expect, it } from 'vitest'
import {
  buildInitialState,
  canSubmitRound,
  isFinished,
  skyjoModuleReducer,
  toDraft,
} from './skyjoModuleReducer'
import { DRAFT_VERSION } from './skyjoModuleTypes'

const PLAYER_IDS = ['p1', 'p2']

function fresh() {
  return buildInitialState(PLAYER_IDS, undefined)
}

describe('buildInitialState', () => {
  it('starts empty with nothing persisted', () => {
    const state = fresh()
    expect(state.rounds).toEqual([])
    expect(state.enderPlayerId).toBeUndefined()
    expect(state.confirmAbandon).toBe(false)
  })

  it('restores a draft written for the same table', () => {
    const draft = {
      version: DRAFT_VERSION,
      players: PLAYER_IDS,
      rounds: [{ enderPlayerId: 'p1', entries: [{ playerId: 'p1', rawScore: 2 }, { playerId: 'p2', rawScore: 5 }] }],
      enderPlayerId: 'p2',
      scoreInputs: { p1: '3' },
    }
    const state = buildInitialState(PLAYER_IDS, draft)
    expect(state.rounds).toHaveLength(1)
    expect(state.enderPlayerId).toBe('p2')
    expect(state.scoreInputs.p1).toBe('3')
  })

  it('ignores a draft written for a different table', () => {
    const draft = {
      version: DRAFT_VERSION,
      players: ['other-1', 'other-2'],
      rounds: [],
      scoreInputs: {},
    }
    const state = buildInitialState(PLAYER_IDS, draft)
    expect(state.rounds).toEqual([])
  })

  it('restores a reopened, already-finished match with no round pending', () => {
    const saved = {
      players: PLAYER_IDS,
      rounds: [{ enderPlayerId: 'p1', entries: [{ playerId: 'p1', rawScore: 2 }, { playerId: 'p2', rawScore: 5 }] }],
    }
    const state = buildInitialState(PLAYER_IDS, saved)
    expect(state.rounds).toHaveLength(1)
    expect(state.enderPlayerId).toBeUndefined()
    expect(state.scoreInputs).toEqual({})
  })

  it('ignores garbage without crashing', () => {
    const state = buildInitialState(PLAYER_IDS, { garbage: true })
    expect(state.rounds).toEqual([])
  })
})

describe('canSubmitRound / submitRound', () => {
  it('cannot submit before an ender is chosen', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '4' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p2', value: '9' })
    expect(canSubmitRound(state)).toBe(false)
  })

  it('cannot submit while a score is missing or unparsable', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'selectEnder', playerId: 'p1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '4' })
    expect(canSubmitRound(state)).toBe(false)
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p2', value: 'abc' })
    expect(canSubmitRound(state)).toBe(false)
  })

  it('accepts a negative score', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'selectEnder', playerId: 'p1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '-2' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p2', value: '5' })
    expect(canSubmitRound(state)).toBe(true)
  })

  it('records the round and clears the pending fields', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'selectEnder', playerId: 'p1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p2', value: '10' })
    state = skyjoModuleReducer(state, { type: 'submitRound' })

    expect(state.rounds).toEqual([
      {
        enderPlayerId: 'p1',
        entries: [
          { playerId: 'p1', rawScore: 1 },
          { playerId: 'p2', rawScore: 10 },
        ],
      },
    ])
    expect(state.enderPlayerId).toBeUndefined()
    expect(state.scoreInputs).toEqual({})
  })

  it('is a no-op when submitted while not ready', () => {
    const state = fresh()
    const next = skyjoModuleReducer(state, { type: 'submitRound' })
    expect(next).toBe(state)
  })
})

describe('undoLastRound', () => {
  it('removes the last round only', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'selectEnder', playerId: 'p1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p2', value: '2' })
    state = skyjoModuleReducer(state, { type: 'submitRound' })
    state = skyjoModuleReducer(state, { type: 'undoLastRound' })
    expect(state.rounds).toEqual([])
  })

  it('is a no-op with no round played yet', () => {
    const state = fresh()
    const next = skyjoModuleReducer(state, { type: 'undoLastRound' })
    expect(next).toBe(state)
  })
})

describe('abandon confirmation', () => {
  it('toggles on and off', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'showAbandonConfirm' })
    expect(state.confirmAbandon).toBe(true)
    state = skyjoModuleReducer(state, { type: 'dismissAbandonConfirm' })
    expect(state.confirmAbandon).toBe(false)
  })
})

describe('isFinished', () => {
  it('flips true once a round leaves a player at or past the threshold', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'selectEnder', playerId: 'p1' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '40' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p2', value: '100' })
    state = skyjoModuleReducer(state, { type: 'submitRound' })
    expect(isFinished(state)).toBe(true)
  })
})

describe('toDraft', () => {
  it('round-trips through buildInitialState', () => {
    let state = fresh()
    state = skyjoModuleReducer(state, { type: 'selectEnder', playerId: 'p2' })
    state = skyjoModuleReducer(state, { type: 'updateScoreInput', playerId: 'p1', value: '3' })

    const restored = buildInitialState(PLAYER_IDS, toDraft(state))
    expect(restored.enderPlayerId).toBe('p2')
    expect(restored.scoreInputs.p1).toBe('3')
  })
})
