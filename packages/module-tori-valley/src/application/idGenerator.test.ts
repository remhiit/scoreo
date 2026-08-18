import { describe, expect, it } from 'vitest'
import { isUuid, newId } from './idGenerator'

describe('idGenerator', () => {
  it('generates a valid UUID v4', () => {
    expect(isUuid(newId())).toBe(true)
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
  })

  it('rejects a non-UUID string', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
  })
})
