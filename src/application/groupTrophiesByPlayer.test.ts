import { describe, expect, it } from 'vitest'
import type { Trophy } from '../domain/model/trophy'
import { groupTrophiesByPlayer, TROPHY_BADGE_ORDER } from './groupTrophiesByPlayer'

function trophy(id: string, holderIds: string[], value = 1): Trophy {
  return { id, holders: holderIds.map((playerId) => ({ playerId, name: playerId, value })) }
}

describe('groupTrophiesByPlayer', () => {
  it('places f3 (the acquired monthly record) right after the permanent records, before the rotating a2/f2', () => {
    expect(TROPHY_BADGE_ORDER).toEqual(['a1', 'a4', 'b2', 'b3', 'c1', 'c3', 'd1', 'e1', 'f3', 'a2', 'f2'])
  })

  it('gives a player one badge per f3 holder entry, one per month won', () => {
    const holders = [
      { playerId: 'p1', name: 'p1', value: 2, period: { kind: 'month' as const, year: 2026, month: 6 } },
      { playerId: 'p1', name: 'p1', value: 1, period: { kind: 'month' as const, year: 2026, month: 4 } },
    ]
    const trophies: Trophy[] = [{ id: 'f3', holders }]

    const result = groupTrophiesByPlayer(trophies)

    expect(result.get('p1')).toHaveLength(2)
    expect(result.get('p1')?.map((b) => b.holder.period?.month)).toEqual([6, 4])
  })

  it('groups a player holding several trophies, in badge display order', () => {
    const trophies = [trophy('f2', ['p1']), trophy('b2', ['p1']), trophy('a1', ['p1'])]

    const result = groupTrophiesByPlayer(trophies)

    expect(result.get('p1')?.map((b) => b.trophy.id)).toEqual(['a1', 'b2', 'f2'])
  })

  it('omits a player who holds no trophy', () => {
    const trophies = [trophy('a1', ['p1'])]

    const result = groupTrophiesByPlayer(trophies)

    expect(result.has('p2')).toBe(false)
  })

  it('gives every ex aequo holder of a trophy its own badge', () => {
    const trophies = [trophy('b2', ['p1', 'p2'], 7)]

    const result = groupTrophiesByPlayer(trophies)

    expect(result.get('p1')).toEqual([{ trophy: trophies[0], holder: { playerId: 'p1', name: 'p1', value: 7 } }])
    expect(result.get('p2')).toEqual([{ trophy: trophies[0], holder: { playerId: 'p2', name: 'p2', value: 7 } }])
  })

  it('gives a player one badge per holder entry when it holds the same trophy id twice', () => {
    const holders = [
      { playerId: 'p1', name: 'p1', value: 10, detail: 'Chess' },
      { playerId: 'p1', name: 'p1', value: 20, detail: 'Poker' },
    ]
    const trophies: Trophy[] = [{ id: 'd1', holders }]

    const result = groupTrophiesByPlayer(trophies)

    expect(result.get('p1')?.map((b) => b.holder.detail)).toEqual(['Chess', 'Poker'])
  })
})
