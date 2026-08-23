import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The package no longer builds an app of its own, so there is no vite.config.ts
// left to extend: the React plugin is declared here, for the JSX in the suite.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
  },
})
