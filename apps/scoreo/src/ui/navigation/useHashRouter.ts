import { useCallback, useEffect, useState } from 'react'
import { parseHash, screenToHash } from './hash'
import type { Screen } from './screen'

function restoreFromHash(): Screen {
  return parseHash(window.location.hash.replace(/^#/, ''))
}

/** Where the current screen comes from and how to change it, whatever keeps it. */
export interface Router {
  current: Screen
  navigate: (screen: Screen) => void
}

/** The router `useHashRouter` returns: a `Router` kept in the URL hash. */
export type HashRouter = Router

/** Syncs a Screen with window.location.hash. Ported from AppNavigator.kt. */
export function useHashRouter(): Router {
  const [current, setCurrent] = useState<Screen>(() => restoreFromHash())

  useEffect(() => {
    const onPopState = () => setCurrent(restoreFromHash())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((screen: Screen) => {
    window.history.pushState(null, '', screenToHash(screen))
    setCurrent(screen)
  }, [])

  return { current, navigate }
}
