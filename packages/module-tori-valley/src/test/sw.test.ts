import { describe, expect, it } from 'vitest'
// The service worker ships as a plain file in `public/` — it is never bundled,
// so it cannot be imported as a module. `?raw` pulls in the exact source that
// gets deployed, which is then evaluated by the harness below. The test lives
// here rather than next to the file it covers because `vitest.config.ts` only
// collects `src/**/*.{test,spec}.{ts,tsx}`: a `public/sw.test.ts` would never
// run (and `tsconfig.app.json` only type-checks `src/` either way).
import swSource from '../../public/sw.js?raw'

interface FakeExtendableEvent {
  waitUntil: (value: Promise<unknown>) => void
}

type SwListener = (event: FakeExtendableEvent) => void

interface FakeCache {
  addAll: (assets: string[]) => Promise<void>
}

interface LoadedServiceWorker {
  listeners: Map<string, SwListener>
  deletedCaches: string[]
}

/**
 * Evaluates the real `public/sw.js` with `self`, `caches` and `fetch` replaced
 * by test doubles, and returns the listeners it registered.
 */
function loadServiceWorker(existingCacheNames: string[]): LoadedServiceWorker {
  const listeners = new Map<string, SwListener>()
  const deletedCaches: string[] = []

  const fakeSelf = {
    addEventListener: (type: string, listener: SwListener) => {
      listeners.set(type, listener)
    },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  }

  const fakeCaches = {
    open: (): Promise<FakeCache> => Promise.resolve({ addAll: () => Promise.resolve() }),
    keys: () => Promise.resolve([...existingCacheNames]),
    delete: (name: string) => {
      deletedCaches.push(name)
      return Promise.resolve(true)
    },
    match: () => Promise.resolve(undefined),
  }

  const evaluate = new Function('self', 'caches', 'fetch', swSource) as unknown as (
    self: unknown,
    caches: unknown,
    fetch: unknown,
  ) => void

  evaluate(fakeSelf, fakeCaches, () => Promise.resolve(new Response()))

  return { listeners, deletedCaches }
}

async function activate(sw: LoadedServiceWorker): Promise<void> {
  const listener = sw.listeners.get('activate')
  if (!listener) throw new Error('sw.js registered no "activate" listener')

  const pending: Promise<unknown>[] = []
  listener({ waitUntil: (value) => pending.push(value) })
  await Promise.all(pending)
}

describe('sw.js activate', () => {
  // remhiit.github.io hosts several PWAs and the Cache Storage API is scoped to
  // the origin, not to the service worker's scope — see doc/technical/architecture.md.
  it('leaves caches belonging to other apps on the same origin untouched', async () => {
    const sw = loadServiceWorker(['tori-valley-v1', 'scoreo-v3', 'ksabord-v1'])

    await activate(sw)

    expect(sw.deletedCaches).not.toContain('scoreo-v3')
    expect(sw.deletedCaches).not.toContain('ksabord-v1')
  })

  it('deletes older Torī Valley caches', async () => {
    const sw = loadServiceWorker(['tori-valley-v1', 'tori-valley-v0'])

    await activate(sw)

    expect(sw.deletedCaches).toEqual(['tori-valley-v0'])
  })

  it('keeps the current cache', async () => {
    const sw = loadServiceWorker(['tori-valley-v1', 'tori-valley-v0', 'scoreo-v3'])

    await activate(sw)

    expect(sw.deletedCaches).not.toContain('tori-valley-v1')
  })
})
