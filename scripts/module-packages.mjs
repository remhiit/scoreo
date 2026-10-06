// The scoring-module packages of the workspace, and the invariants that tie
// them to the other places a module is named. One definition shared by every
// guard that walks the modules (check-design-tokens.mjs, check-module-styles.mjs)
// so they can never disagree on what counts as a module.
//
// See doc/technical/module-contract.md.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const PACKAGES_DIR = 'packages'

/**
 * Every scoring-module package: `packages/module-*`, except `module-api` (the
 * host ↔ module contract, not a module). Sorted; empty when `packagesDir` is
 * absent.
 */
export function modulePackages(packagesDir = PACKAGES_DIR) {
  if (!existsSync(packagesDir)) return []
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith('module-') && name !== 'module-api')
    .sort()
    .map((name) => join(packagesDir, name))
}

/**
 * The legacy stylesheets still present in module packages. Every module
 * composes the design system and has given its own palette up: a
 * `src/styles.css` left behind is dead weight at best, a second look at worst.
 */
export function legacyStylesheets(packagesDir = PACKAGES_DIR) {
  return modulePackages(packagesDir)
    .map((dir) => join(dir, 'src/styles.css'))
    .filter((path) => existsSync(path))
}

const MODULES_BLOCK = /const MODULES\b[^=]*=\s*\{([\s\S]*?)\n\}\n/
const SURFACE = /surface:\s*'\.module-([\w-]+)/g

/**
 * Reads the `MODULES` table of `apps/scoreo/e2e/module-style-isolation.spec.ts`
 * statically (the spec imports Playwright, so it cannot be loaded here): the
 * module id of each row, taken from the row's `.module-<id>` surface.
 * Throws when the table cannot be found or holds no row, rather than return nothing.
 */
export function styleIsolationIds(specText) {
  const block = specText.match(MODULES_BLOCK)?.[1]
  if (!block) throw new Error('module-style-isolation.spec.ts: no MODULES table found')
  const ids = [...block.matchAll(SURFACE)].map((m) => m[1])
  if (ids.length === 0) {
    throw new Error('module-style-isolation.spec.ts: no `.module-<id>` surface in MODULES')
  }
  return ids
}
