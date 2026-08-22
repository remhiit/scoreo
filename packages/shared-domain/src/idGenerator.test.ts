import { describe, expect, it } from 'vitest'
import { isUuid, newId } from './idGenerator'

describe('newId', () => {
  it('generates a valid UUID v4', () => {
    expect(isUuid(newId())).toBe(true)
  })

  it('generates an id of the canonical length', () => {
    expect(newId()).toHaveLength(36)
  })

  it('generates an id carrying version 4 at position 14', () => {
    expect(newId()[14]).toBe('4')
  })

  it('generates an id carrying the RFC 4122 variant bits at position 19', () => {
    expect(['8', '9', 'a', 'b']).toContain(newId()[19])
  })

  it('generates an id with hyphens at the canonical positions', () => {
    const id = newId()
    expect(id[8]).toBe('-')
    expect(id[13]).toBe('-')
    expect(id[18]).toBe('-')
    expect(id[23]).toBe('-')
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
  })
})

describe('isUuid', () => {
  it('accepts a generated id', () => {
    expect(isUuid(newId())).toBe(true)
  })

  it('accepts an uppercase UUID', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('rejects a non-UUID string', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
  })

  it('rejects the empty string', () => {
    expect(isUuid('')).toBe(false)
  })

  // Legacy ids minted before UUIDs — `migrateMatches` keys off this rejection.
  it('rejects a numeric legacy id', () => {
    expect(isUuid('1700000000000')).toBe(false)
  })

  it('rejects a UUID of another version', () => {
    expect(isUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(false)
  })
})
