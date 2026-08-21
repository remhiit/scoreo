import { useCallback, useEffect, useState } from 'react'
import { parseHash, screenToHash } from './hash'
import type { Screen } from './screen'

function restoreFromHash(): Screen {
  return parseHash(window.location.hash.replace(/^#/, ''))
}

export interface HashRouter {
  current: Screen
  navigate: (screen: Screen) => void
}

/** Syncs a Screen with window.location.hash. */
export function useHashRouter(): HashRouter {
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
