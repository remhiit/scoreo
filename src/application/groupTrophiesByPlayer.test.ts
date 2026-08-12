import { describe, expect, it } from 'vitest'
import type { Trophy } from '../domain/model/trophy'
import { groupTrophiesByPlayer } from './groupTrophiesByPlayer'

function trophy(id: string, holderIds: string[], value = 1): Trophy {
  return { id, holders: holderIds.map((playerId) => ({ playerId, name: playerId, value })) }
}

describe('groupTrophiesByPlayer', () => {
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
