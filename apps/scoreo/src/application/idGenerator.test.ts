import { describe, expect, it } from 'vitest'
import { newId } from './idGenerator'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('IdGenerator', () => {
  it('generated id matches UUID v4 format', () => {
    const id = newId()
    expect(UUID_REGEX.test(id)).toBe(true)
  })

  it('generated id has correct length', () => {
    expect(newId()).toHaveLength(36)
  })

  it('generated id has version 4 at position 14', () => {
    expect(newId()[14]).toBe('4')
  })

  it('generated id has correct variant bits at position 19', () => {
    expect(['8', '9', 'a', 'b']).toContain(newId()[19])
  })

  it('generated ids are unique', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
  })

  it('generated id has hyphens at correct positions', () => {
    const id = newId()
    expect(id[8]).toBe('-')
    expect(id[13]).toBe('-')
    expect(id[18]).toBe('-')
    expect(id[23]).toBe('-')
  })
})
