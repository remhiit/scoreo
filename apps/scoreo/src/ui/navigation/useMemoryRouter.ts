import { useCallback, useState } from 'react'
import type { Screen } from './screen'
import type { Router } from './router'

/**
 * A router that keeps the current Screen in memory, leaving the URL alone.
 * The design catalog runs several `AppShell`s on one page (apps/catalog): each
 * navigates on its own, without fighting over `window.location.hash`.
 */
export function useMemoryRouter(initial: Screen): Router {
  const [current, setCurrent] = useState<Screen>(initial)
  const navigate = useCallback((screen: Screen) => setCurrent(screen), [])
  return { current, navigate }
}
