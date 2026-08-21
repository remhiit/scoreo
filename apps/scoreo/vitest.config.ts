import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      // `dist/` holds a copy of public/sw.test.ts after a build; without this,
      // a local `pnpm build` then `pnpm test` runs that suite twice.
      exclude: [...configDefaults.exclude, 'e2e/**', 'dist/**'],
    },
  }),
)
