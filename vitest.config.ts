import { defineConfig } from 'vitest/config'

// The workspace root only owns the repo-automation scripts under scripts/;
// every application/package test runs from its own project via `pnpm -r test`.
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.mjs'],
    environment: 'node',
  },
})
