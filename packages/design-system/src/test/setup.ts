import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest.config.ts sets `globals: false`, so @testing-library/react's automatic
// afterEach-based cleanup (which expects a global test framework) isn't wired up
// on its own — register it explicitly so DOM from one test doesn't leak into the next.
afterEach(cleanup)
