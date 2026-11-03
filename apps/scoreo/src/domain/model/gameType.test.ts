import { describe, expect, it } from 'vitest'
import { assertValidPlayerRange } from './gameType'

// The rest of the game type rules are tested with their definition, in
// `@scoreboards/shared-domain`; this one throws the app's `ValidationError`.
describe('player range', () => {
  it('assertValidPlayerRange accepts equal bounds and refuses the rest', () => {
    expect(() => assertValidPlayerRange({ minPlayers: 3, maxPlayers: 3 })).not.toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: null, maxPlayers: null })).not.toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: 4, maxPlayers: 3 })).toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: 0, maxPlayers: null })).toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: null, maxPlayers: 1.5 })).toThrow()
  })
})
