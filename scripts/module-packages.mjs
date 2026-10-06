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
 * The legacy stylesheets still present in modules listed as composing the
 * design system. A migrated module has given its own palette up: a
 * `src/styles.css` left behind is dead weight at best, a second look at worst.
 */
export function legacyStylesheetsOfComposingModules(composingIds, packagesDir = PACKAGES_DIR) {
  return composingIds
    .map((id) => join(packagesDir, `module-${id}`, 'src/styles.css'))
    .filter((path) => existsSync(path))
}

const MODULES_BLOCK = /const MODULES\b[^=]*=\s*\{([\s\S]*?)\n\}\n/
const SURFACE = /surface:\s*'\.module-([\w-]+)/g
const IDENTITY = /identity:\s*'(own|scoreo)'/g

/**
 * Reads the `MODULES` table of `apps/scoreo/e2e/module-style-isolation.spec.ts`
 * statically (the spec imports Playwright, so it cannot be loaded here): one
 * `{ id, identity }` per row, the id taken from the row's `.module-<id>` surface.
 * Throws when the table cannot be read row by row, rather than return nothing.
 */
export function styleIsolationRows(specText) {
  const block = specText.match(MODULES_BLOCK)?.[1]
  if (!block) throw new Error('module-style-isolation.spec.ts: no MODULES table found')
  const ids = [...block.matchAll(SURFACE)].map((m) => m[1])
  const identities = [...block.matchAll(IDENTITY)].map((m) => m[1])
  if (ids.length === 0 || ids.length !== identities.length) {
    throw new Error(
      `module-style-isolation.spec.ts: ${ids.length} surface(s) for ${identities.length} identity field(s) in MODULES`,
    )
  }
  return ids.map((id, i) => ({ id, identity: identities[i] }))
}

/**
 * Rows whose `identity` disagrees with `MODULES_COMPOSING_DS`: a module composes
 * the design system (lint) exactly when it wears Scoreo's look (e2e).
 */
export function identityMismatches(rows, composingIds) {
  return rows.filter(({ id, identity }) => (identity === 'scoreo') !== composingIds.includes(id))
}
