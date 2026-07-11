import { describe, expect, it } from 'vitest'
import { PlayerSchema } from './player.schema'
import { PlayerScoreSchema } from './playerScore.schema'
import { GameTypeSchema } from './gameType.schema'
import { MatchSchema } from './match.schema'
import { MatchDraftSchema } from './matchDraft.schema'
import { TieBreakRuleSchema, WinConditionSchema, tieBreakRuleLabel } from './enums'

/** Round-trips a value through JSON (as localStorage does) then re-validates it. */
function roundTrip<T>(schema: { parse: (input: unknown) => T }, value: unknown): T {
  return schema.parse(JSON.parse(JSON.stringify(value)))
}

describe('serialization contract (backward compatibility)', () => {
  it('Player serialization round-trip', () => {
    const original = { id: 'p1', name: 'Alice', active: true }
    expect(roundTrip(PlayerSchema, original)).toEqual(original)
  })

  it('GameType serialization round-trip', () => {
    const original = {
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    }
    expect(roundTrip(GameTypeSchema, original)).toEqual(original)
  })

  it('GameType with MANUAL winCondition serialization round-trip', () => {
    const original = {
      id: 'gt2',
      name: 'Custom',
      winCondition: 'MANUAL',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    }
    expect(roundTrip(GameTypeSchema, original)).toEqual(original)
  })

  it('PlayerScore serialization round-trip', () => {
    const original = { playerId: 'p1', score: 42 }
    expect(roundTrip(PlayerScoreSchema, original)).toEqual(original)
  })

  it('Match serialization round-trip', () => {
    const original = {
      id: 'm1',
      date: 1000000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
    }
    expect(roundTrip(MatchSchema, original)).toEqual(original)
  })

  it('Match with manual winners serialization round-trip', () => {
    const original = {
      id: 'm2',
      date: 2000000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      manualWinners: ['p1'],
      secondaryPlayerScores: [],
    }
    expect(roundTrip(MatchSchema, original)).toEqual(original)
  })

  it('Match ignores unknown fields (backward compat)', () => {
    const json = {
      id: 'm1',
      date: 1000000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      futureField: 'should be ignored',
    }
    const decoded = MatchSchema.parse(json)
    expect(decoded.id).toBe('m1')
    expect((decoded as Record<string, unknown>).futureField).toBeUndefined()
  })

  it('PlayerScore with extra fields ignores them', () => {
    const decoded = PlayerScoreSchema.parse({ playerId: 'p1', score: 42, rank: 1 })
    expect(decoded.playerId).toBe('p1')
    expect(decoded.score).toBe(42)
    expect((decoded as Record<string, unknown>).rank).toBeUndefined()
  })

  it('Player with active field serialization round-trip', () => {
    const original = { id: 'p1', name: 'Alice', active: true }
    expect(roundTrip(PlayerSchema, original)).toEqual(original)
  })

  it('Player with active false serialization round-trip', () => {
    const original = { id: 'p1', name: 'Alice', active: false }
    expect(roundTrip(PlayerSchema, original)).toEqual(original)
  })

  it('Player with anonymized name serialization round-trip', () => {
    const original = { id: 'p1', name: '', active: false }
    expect(roundTrip(PlayerSchema, original)).toEqual(original)
  })

  it('Player without active field defaults to true (backward compat)', () => {
    const decoded = PlayerSchema.parse({ id: 'p1', name: 'Alice' })
    expect(decoded).toEqual({ id: 'p1', name: 'Alice', active: true })
  })

  it('Match without manualWinners defaults to empty array (backward compat)', () => {
    const decoded = MatchSchema.parse({
      id: 'm1',
      date: 1000000,
      gameTypeId: 'gt1',
      playerScores: [],
    })
    expect(decoded.manualWinners).toEqual([])
  })

  it('PlayerScore backward compat deserialization', () => {
    const decoded = PlayerScoreSchema.parse({ playerId: 'p1', score: 10 })
    expect(decoded).toEqual({ playerId: 'p1', score: 10 })
  })

  it('GameType backward compat deserialization', () => {
    const decoded = GameTypeSchema.parse({ id: 'gt1', name: 'Test', winCondition: 'HIGHEST_SCORE' })
    expect(decoded).toEqual({
      id: 'gt1',
      name: 'Test',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
  })

  it('GameType with new tie-break fields serialization round-trip', () => {
    const original = {
      id: 'gt3',
      name: 'Belote with tie-break',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Best Secondary',
      active: true,
    }
    expect(roundTrip(GameTypeSchema, original)).toEqual(original)
  })

  it('GameType without tie-break fields defaults correctly (backward compat)', () => {
    const decoded = GameTypeSchema.parse({ id: 'gt1', name: 'Classic', winCondition: 'HIGHEST_SCORE' })
    expect(decoded).toEqual({
      id: 'gt1',
      name: 'Classic',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
  })

  it('GameType with MANUAL_SELECTION tie-break serialization round-trip', () => {
    const decoded = GameTypeSchema.parse({
      id: 'gt4',
      name: 'Tournament',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'MANUAL_SELECTION',
    })
    expect(decoded).toEqual({
      id: 'gt4',
      name: 'Tournament',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'MANUAL_SELECTION',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
  })

  it('Match with secondaryPlayerScores serialization round-trip', () => {
    const original = {
      id: 'm3',
      date: 3000000,
      gameTypeId: 'gt3',
      playerScores: [
        { playerId: 'p1', score: 100 },
        { playerId: 'p2', score: 100 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [
        { playerId: 'p1', score: 50 },
        { playerId: 'p2', score: 75 },
      ],
    }
    expect(roundTrip(MatchSchema, original)).toEqual(original)
  })

  it('Match without secondaryPlayerScores defaults to empty array (backward compat)', () => {
    const decoded = MatchSchema.parse({
      id: 'm1',
      date: 1000000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
    })
    expect(decoded.secondaryPlayerScores).toEqual([])
  })

  it('TieBreakRule (and WinCondition) enum round-trip', () => {
    for (const rule of ['NONE', 'MANUAL_SELECTION', 'SECONDARY_SCORE'] as const) {
      expect(roundTrip(TieBreakRuleSchema, rule)).toBe(rule)
    }
    for (const condition of ['HIGHEST_SCORE', 'LOWEST_SCORE', 'MANUAL'] as const) {
      expect(roundTrip(WinConditionSchema, condition)).toBe(condition)
    }
  })

  it('TieBreakRule label generation', () => {
    expect(tieBreakRuleLabel('NONE')).toBe('No tie-break')
    expect(tieBreakRuleLabel('MANUAL_SELECTION')).toBe('Manual selection')
    expect(tieBreakRuleLabel('SECONDARY_SCORE')).toBe('Secondary score')
  })

  it('MatchDraft serialization round-trip', () => {
    const original = {
      gameTypeId: 'gt1',
      playerIds: ['alice', 'bob'],
      rounds: [
        { alice: '10', bob: '5' },
        { alice: '3', bob: '7' },
      ],
      updatedAt: 1767225600000,
    }
    expect(roundTrip(MatchDraftSchema, original)).toEqual(original)
  })

  it('MatchDraft without updatedAt defaults to current time (backward compat)', () => {
    const decoded = MatchDraftSchema.parse({
      gameTypeId: 'gt1',
      playerIds: ['alice', 'bob'],
      rounds: [{ alice: '10', bob: '5' }],
    })
    expect(decoded.gameTypeId).toBe('gt1')
    expect(decoded.playerIds).toEqual(['alice', 'bob'])
    expect(decoded.rounds).toHaveLength(1)
    expect(decoded.rounds[0].alice).toBe('10')
    expect(decoded.updatedAt).toBeGreaterThan(0)
  })

  it('MatchDraft with empty rounds round-trip', () => {
    const original = { gameTypeId: 'gt1', playerIds: ['alice', 'bob'], rounds: [], updatedAt: 1000 }
    expect(roundTrip(MatchDraftSchema, original)).toEqual(original)
  })

  it('MatchDraft with single empty round round-trip', () => {
    const original = { gameTypeId: 'gt1', playerIds: ['alice', 'bob'], rounds: [{}], updatedAt: 2000 }
    expect(roundTrip(MatchDraftSchema, original)).toEqual(original)
  })

  it('MatchDraft with partial round data (missing players) round-trip', () => {
    const original = {
      gameTypeId: 'gt1',
      playerIds: ['alice', 'bob', 'charlie'],
      rounds: [{ alice: '10' }],
      updatedAt: 3000,
    }
    const decoded = roundTrip(MatchDraftSchema, original)
    expect(decoded).toEqual(original)
    expect(decoded.rounds[0].alice).toBe('10')
    expect(decoded.rounds[0].bob).toBeUndefined()
  })
})
