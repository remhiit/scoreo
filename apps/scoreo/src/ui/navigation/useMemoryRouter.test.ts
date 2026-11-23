import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HISTORY_SCREEN, HOME_SCREEN, STATS_SCREEN } from './screen'
import { useMemoryRouter } from './useMemoryRouter'

describe('useMemoryRouter', () => {
  it('starts on the screen it is given', () => {
    const { result } = renderHook(() => useMemoryRouter(STATS_SCREEN))
    expect(result.current.current).toEqual(STATS_SCREEN)
  })

  it('navigates without touching the URL hash', () => {
    window.history.replaceState(null, '', '#')
    const { result } = renderHook(() => useMemoryRouter(HOME_SCREEN))
    act(() => result.current.navigate(HISTORY_SCREEN))
    expect(result.current.current).toEqual(HISTORY_SCREEN)
    expect(window.location.hash).toBe('')
  })
})
