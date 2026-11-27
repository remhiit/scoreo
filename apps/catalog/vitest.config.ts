import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { screenUsage } from './usagePlugin.ts'

export default defineConfig({
  plugins: [screenUsage(fileURLToPath(new URL('../..', import.meta.url)))],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
  },
})
