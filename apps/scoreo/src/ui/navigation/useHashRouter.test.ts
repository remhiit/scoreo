import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useHashRouter } from './useHashRouter'

describe('useHashRouter', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '#/')
  })

  it('restores the current screen from the initial hash', () => {
    window.history.replaceState(null, '', '#/history')
    const { result } = renderHook(() => useHashRouter())
    expect(result.current.current).toEqual({ type: 'History' })
  })

  it('navigate() pushes a new hash and updates current', () => {
    const { result } = renderHook(() => useHashRouter())
    act(() => {
      result.current.navigate({ type: 'Stats' })
    })
    expect(result.current.current).toEqual({ type: 'Stats' })
    expect(window.location.hash).toBe('#/stats')
  })

  it('syncs current when popstate fires (back/forward navigation)', () => {
    const { result } = renderHook(() => useHashRouter())
    act(() => {
      result.current.navigate({ type: 'Games' })
    })
    expect(result.current.current).toEqual({ type: 'Games' })

    act(() => {
      window.history.replaceState(null, '', '#/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.current).toEqual({ type: 'Home' })
  })
})
