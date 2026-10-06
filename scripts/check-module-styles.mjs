#!/usr/bin/env node
// Fails if a scoring module's stylesheet breaks the style contract between a
// module and its host. Modeled on check-doc-links.mjs.
//
// A module adopts Scoreo's identity: it composes @scoreboards/design-system, and
// only its game pieces — the few things the design system has no component for —
// carry CSS of their own, under `src/design/`. That CSS stays inside its module
// and speaks the host's visual language, which this guard checks three ways:
//
//   - every rule scoped under `.module-<moduleId>`, so a module's declarations
//     never reach Scoreo — a stylesheet is not unloaded on navigation, so a leak
//     would restyle the host for the rest of the session;
//   - every class name prefixed, never one the design system also styles, so the
//     host's rules never reach the module by name. Torī Valley shipped from #331
//     to #348 with every player card laid out in a row because it reused the
//     host's plain `.card`;
//   - in `src/design/` only, colour through the design system's semantic tokens
//     alone: no Catppuccin palette token (`var(--ctp-…)`) and no raw colour
//     (hex, rgb()/rgba(), hsl()/hsla()) — the semantic tokens are what follow
//     Scoreo's flavour, the rest would pin one.
//
// A module that has not migrated yet still ships its legacy `src/styles.css`,
// with its own palette: it is held to the first two checks only.
//
// See doc/technical/module-contract.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PACKAGES_DIR, modulePackages } from './module-packages.mjs'

// Everything the host styles lives in the design system.
const HOST_CSS_DIRS = ['packages/design-system/src']

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

const DECLARATION = /([a-zA-Z-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g
const PALETTE_TOKEN = /var\(\s*(--ctp-[\w-]+)/g
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g

/**
 * Colours a game piece may not write: a Catppuccin palette token or a raw
 * colour, anywhere in a declaration's value. Only the semantic tokens of the
 * design system (`--surface-card`, `--color-primary`…) follow Scoreo's flavour.
 * Applied to `src/design/` sheets only — a legacy `src/styles.css` keeps its own
 * palette until its module migrates.
 */
export function findColourViolations(css, moduleFile) {
  const violations = []
  for (const [, property, value] of css.replace(COMMENTS, '').matchAll(DECLARATION)) {
    for (const [, token] of value.matchAll(PALETTE_TOKEN)) {
      violations.push({
        file: moduleFile,
        kind: 'palette-token',
        detail: `${property.trim()}: var(${token})`,
      })
    }
    for (const [found] of value.matchAll(RAW_COLOUR)) {
      violations.push({
        file: moduleFile,
        kind: 'raw-colour',
        detail: `${property.trim()}: ${found}`,
      })
    }
  }
  return violations
}

/** Whether a module stylesheet is a game piece's, under `src/design/`. */
export function isDesignStylesheet(file) {
  return file.split(sep).join('/').includes('/src/design/')
}

function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return cssFiles(path)
    return entry.name.endsWith('.css') ? [path] : []
  })
}

function hostClasses() {
  const files = HOST_CSS_DIRS.filter((dir) => existsSync(dir)).flatMap(cssFiles)
  return new Set(files.flatMap((file) => [...classNames(readFileSync(file, 'utf8'))]))
}

/**
 * Every stylesheet a scoring module ships: its legacy `src/styles.css` while it
 * still has one, plus every sheet under `src/design/` — the one folder where a
 * module composing the design system writes its game pieces' CSS. Either may be
 * absent; a module with neither simply contributes nothing.
 */
export function moduleStylesheets(packagesDir = PACKAGES_DIR) {
  return modulePackages(packagesDir).flatMap((dir) => {
    const legacy = join(dir, 'src/styles.css')
    const design = join(dir, 'src/design')
    return [
      ...(existsSync(legacy) ? [legacy] : []),
      ...(existsSync(design) ? cssFiles(design).sort() : []),
    ]
  })
}

function main() {
  const host = hostClasses()

  if (modulePackages(PACKAGES_DIR).length === 0) {
    console.error('No module package found under packages/ — has the layout changed?')
    process.exit(1)
  }

  const sheets = moduleStylesheets()

  const violations = sheets.flatMap((file) => {
    const css = readFileSync(file, 'utf8')
    return [
      ...findViolations(css, file, host),
      ...(isDesignStylesheet(file) ? findColourViolations(css, file) : []),
    ]
  })

  if (violations.length > 0) {
    console.error(`Found ${violations.length} module stylesheet violation(s):\n`)
    for (const { file, kind, detail } of violations) {
      const why = {
        unscoped: 'not scoped under .module-<moduleId> — it would style the whole host',
        'collides-with-host':
          'a class name Scoreo also styles — the host’s rule leaks into the module',
        'palette-token': 'a Catppuccin palette token — use a semantic token of the design system',
        'raw-colour': 'a raw colour — use a semantic token of the design system',
      }[kind]
      console.error(`  - ${file}: ${detail} → ${why}`)
    }
    console.error('\nSee doc/technical/module-contract.md.')
    process.exit(1)
  }

  console.log(
    `All ${sheets.length} module stylesheet(s) are scoped and collision-free; game pieces use semantic colour tokens only.`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
