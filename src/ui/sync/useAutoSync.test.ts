import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AutoSyncCoordinator } from '../../application/autoSyncCoordinator'
import { useAutoSync } from './useAutoSync'

function fakeCoordinator() {
  return { start: vi.fn(), stop: vi.fn() } as unknown as AutoSyncCoordinator
}

describe('useAutoSync', () => {
  it('is a no-op when coordinator is undefined', () => {
    expect(() => renderHook(() => useAutoSync(undefined))).not.toThrow()
  })

  it('starts the coordinator on mount and stops it on unmount', () => {
    const coordinator = fakeCoordinator()
    const { unmount } = renderHook(() => useAutoSync(coordinator))

    expect(coordinator.start).toHaveBeenCalledTimes(1)
    expect(coordinator.stop).not.toHaveBeenCalled()

    unmount()

    expect(coordinator.stop).toHaveBeenCalledTimes(1)
  })

  it('stops the previous coordinator and starts the new one when the coordinator prop changes', () => {
    const first = fakeCoordinator()
    const second = fakeCoordinator()
    const { rerender } = renderHook(({ coordinator }) => useAutoSync(coordinator), {
      initialProps: { coordinator: first },
    })

    rerender({ coordinator: second })

    expect(first.stop).toHaveBeenCalledTimes(1)
    expect(second.start).toHaveBeenCalledTimes(1)
  })
})
