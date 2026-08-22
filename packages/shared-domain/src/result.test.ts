import { describe, expect, it } from 'vitest'
import { err, ok, type Result } from './result'

describe('Result', () => {
  it('ok carries the value', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 })
  })

  it('err carries the error', () => {
    const error = new Error('boom')
    expect(err(error)).toEqual({ ok: false, error })
  })

  it('narrows to the value branch once ok is checked', () => {
    const result: Result<number, Error> = ok(1)
    expect(result.ok ? result.value : null).toBe(1)
  })

  it('narrows to the error branch once ok is checked', () => {
    const result: Result<number, string> = err('nope')
    expect(result.ok ? null : result.error).toBe('nope')
  })
})
