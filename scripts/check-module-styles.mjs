#!/usr/bin/env node
// Fails if a scoring module's stylesheet breaks either half of the style border
// between a module and its host. Modeled on check-doc-links.mjs.
//
// A module keeps the identity of the game it counts, inside an app that has a
// look of its own, and that only holds if the border is guarded **both ways**:
//
//   - every rule scoped under `.module-<moduleId>`, so the module's declarations
//     never reach Scoreo — a stylesheet is not unloaded on navigation, so a leak
//     would retint the host for the rest of the session;
//   - every class name prefixed, so Scoreo's own generic rules never reach the
//     module. `public/css/theme.css` styles plain `.card` and `.empty`; a module
//     reusing those names inherits whatever it does not itself declare. Torī
//     Valley shipped from #331 to #348 with every player card laid out in a row
//     for exactly that reason.
//
// See doc/technical/module-contract.md.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const HOST_CSS_DIR = 'apps/scoreo/public/css'
const PACKAGES_DIR = 'packages'

const COMMENTS = /\/\*[\s\S]*?\*\//g
const CLASS_SELECTOR = /\.(-?[a-zA-Z_][\w-]*)/g

/** Class names a stylesheet styles, comments stripped so prose never counts. */
export function classNames(css) {
  return new Set([...css.replace(COMMENTS, '').matchAll(CLASS_SELECTOR)].map((m) => m[1]))
}

/**
 * Every selector a stylesheet declares, at-rules flattened away.
 *
 * The at-rule *prelude* is dropped rather than the block it opens: a rule inside
 * `@media (prefers-color-scheme: dark)` styles the page exactly like any other,
 * and skipping the block would let an unscoped one through unseen. Keyframe
 * steps survive that flattening and are dropped by name.
 */
const KEYFRAME_STEP = /^(from|to|\d+(\.\d+)?%)$/

export function selectors(css) {
  return css
    .replace(COMMENTS, '')
    .replace(/@[^{;]*\{/g, '')
    .split('}')
    .flatMap((block) => block.split('{')[0].split(','))
    .map((selector) => selector.trim())
    .filter(
      (selector) =>
        selector !== '' &&
        !selector.startsWith('@') &&
        !selector.endsWith(';') &&
        !KEYFRAME_STEP.test(selector),
    )
}

/**
 * The two ways a module stylesheet can breach the border, as a flat list of
 * findings. `hostClasses` is the set of class names the host styles.
 */
export function findViolations(css, moduleFile, hostClasses) {
  const violations = []

  for (const selector of selectors(css)) {
    if (!selector.startsWith('.module-')) {
      violations.push({ file: moduleFile, kind: 'unscoped', detail: selector })
    }
  }

  // `.module-<id>` is the scope itself, named by the contract: it is the one
  // class the host is allowed to know about.
  for (const name of classNames(css)) {
    if (!name.startsWith('module-') && hostClasses.has(name)) {
      violations.push({ file: moduleFile, kind: 'collides-with-host', detail: `.${name}` })
    }
  }

  return violations
}

function hostClasses() {
  const files = readdirSync(HOST_CSS_DIR).filter((name) => name.endsWith('.css'))
  return new Set(files.flatMap((name) => [...classNames(readFileSync(join(HOST_CSS_DIR, name), 'utf8'))]))
}

function moduleStylesheets() {
  return readdirSync(PACKAGES_DIR)
    .filter((name) => name.startsWith('module-') && name !== 'module-api')
    .map((name) => join(PACKAGES_DIR, name, 'src/styles.css'))
}

function main() {
  const host = hostClasses()
  const sheets = moduleStylesheets()

  if (sheets.length === 0) {
    console.error('No module stylesheet found under packages/ — has the layout changed?')
    process.exit(1)
  }

  const violations = sheets.flatMap((file) =>
    findViolations(readFileSync(file, 'utf8'), file, host),
  )

  if (violations.length > 0) {
    console.error(`Found ${violations.length} module stylesheet violation(s):\n`)
    for (const { file, kind, detail } of violations) {
      const why =
        kind === 'unscoped'
          ? 'not scoped under .module-<moduleId> — it would style the whole host'
          : 'a class name Scoreo also styles — the host’s rule leaks into the module'
      console.error(`  - ${file}: ${detail} → ${why}`)
    }
    console.error('\nSee doc/technical/module-contract.md.')
    process.exit(1)
  }

  console.log(`All ${sheets.length} module stylesheet(s) are scoped and collision-free.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
