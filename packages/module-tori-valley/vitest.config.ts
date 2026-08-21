import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Scoped to src/ so Vitest never picks up the Playwright specs in tests/visual/,
      // which its default glob would otherwise match.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
)
