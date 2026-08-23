import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { migrateMilleSabordsKeys } from './infrastructure/migration/migrateMilleSabordsKeys'
import './i18n/i18n'

// One-shot tidy-up of the origin Scoreo shares with the standalone 1kSaBord app
// on GitHub Pages. Idempotent, and it must never keep the app from starting —
// reaching `localStorage` at all throws in a browser with site data blocked.
try {
  migrateMilleSabordsKeys(window.localStorage)
} catch {
  // Nothing to do: the keys stay where they are, the next start tries again.
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root not found')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

document.getElementById('splash')?.classList.add('hidden')
