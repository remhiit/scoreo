import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { i18n } from 'scoreo/catalog'

// vitest.config.ts sets `globals: false`, so @testing-library/react's automatic
// afterEach-based cleanup (which expects a global test framework) isn't wired up
// on its own — register it explicitly so DOM from one test doesn't leak into the next.
afterEach(cleanup)

// The Écrans page shows Scoreo in French (`screens/LiveApp.tsx` switches the shared
// i18n singleton on import); pin it here too so every catalog test runs in French
// whether or not it imports `./screens`.
await i18n.changeLanguage('fr')
