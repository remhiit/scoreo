import { describe, expect, it } from 'vitest'
import { PlayerSchema } from './player.schema'

describe('PlayerSchema', () => {
  it('parses a complete player', () => {
    const player = { id: 'p1', name: 'Alice', active: false }
    expect(PlayerSchema.parse(player)).toEqual(player)
  })

  // Players persisted before the active flag existed carry only id and name.
  it('defaults active to true when the field is absent', () => {
    expect(PlayerSchema.parse({ id: 'p1', name: 'Alice' })).toEqual({
      id: 'p1',
      name: 'Alice',
      active: true,
    })
  })

  it('rejects a player without an id', () => {
    expect(() => PlayerSchema.parse({ name: 'Alice' })).toThrow()
  })
})
