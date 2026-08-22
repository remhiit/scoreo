#!/usr/bin/env node
// Fails if a raw px/duration/easing value in apps/scoreo/public/css/*.css exactly
// matches a design token (apps/scoreo/public/css/tokens/), locking in the mechanical
// var(...) substitution done for issue #238 (Ludo Design System adherence,
// ds_temp/design_handoff_scoreo_ds). Modeled on check-doc-links.mjs.
//
// Only flags values for the properties the substitution actually covers
// (spacing/text-size/radius/duration/easing) — width, height, border,
// max-width, background-position, outline etc. are never inspected.
// A negative px value (e.g. `-12px`, used for negative-margin click-target
// tricks) is not flagged: substituting it needs a calc(-1 * var(...))
// wrapper, not a direct var() swap, so it's out of scope for this ticket.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const CSS_ROOT = 'apps/scoreo/public/css'
const TOKENS_DIR = 'tokens'

/**
 * Every CSS the design tokens govern. A scoring module's stylesheet is scanned
 * too: it renders inside Scoreo, so a raw value there is just as much of a
 * theme leak as one in the app's own CSS.
 */
function cssRoots() {
  const roots = [CSS_ROOT]
  if (!existsSync('packages')) return roots
  for (const entry of readdirSync('packages', { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = join('packages', entry.name, 'src')
    if (existsSync(path)) roots.push(path)
  }
  return roots
}

// Keyed by the exact px integer a token resolves to.
const SPACING_PX = {
  0: '--space-0',
  4: '--space-1',
  8: '--space-2',
  12: '--space-3',
  16: '--space-4',
  20: '--space-5',
  24: '--space-6',
  32: '--space-8',
  40: '--space-10',
  48: '--space-12',
  64: '--space-16',
  44: '--tap-target',
}

// font-size is authored in rem in tokens/typography.css; expressed here as
// the equivalent px at the browser default 16px root (no override in this
// codebase — verified: no `html { font-size: ... }` rule).
const TEXT_PX = {
  12: '--text-xs',
  14: '--text-sm',
  16: '--text-md',
  20: '--text-lg',
  24: '--text-xl',
  32: '--text-2xl',
  40: '--text-3xl',
}

const RADIUS_PX = {
  6: '--radius-sm',
  10: '--radius-md',
  14: '--radius-lg',
  999: '--radius-pill',
}

const DURATION_MS = {
  100: '--duration-fast',
  160: '--duration-normal',
  240: '--duration-slow',
}

const EASE_STANDARD_RE = /cubic-bezier\(\s*0\.2\s*,\s*0\s*,\s*0\s*,\s*1\s*\)/

const SPACING_PROPS = new Set([
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'gap',
  'row-gap',
  'column-gap',
])

const DURATION_PROPS = new Set(['transition', 'transition-duration', 'animation', 'animation-duration'])

function tokenForPxProperty(property, px) {
  // A custom property *defines* a value, it does not consume a token — and a
  // module legitimately defines its own `--radius-sm: 6px`. Only declarations
  // that could have used a var() are candidates.
  if (property.startsWith('--')) return undefined
  if (SPACING_PROPS.has(property)) return SPACING_PX[px]
  if (property === 'font-size') return TEXT_PX[px]
  if (property === 'border-radius' || property.endsWith('-radius')) return RADIUS_PX[px]
  return undefined
}

// No leading `-` or digit/dot immediately before: excludes negative values
// and the fractional/integer part of a larger number.
const PX_RE = /(?<![.\d-])(\d+(?:\.\d+)?)px\b/g
const DURATION_RE = /(?<![.\d])(\d+(?:\.\d+)?)(m?s)\b/g
const DECLARATION_RE = /([a-zA-Z-]+)\s*:\s*([^;{}]+);/g

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
}

/**
 * Blanks out `var(...)` expressions before scanning a value. What sits inside
 * one is either a token name or its deliberate fallback — and a fallback is the
 * correct way to write a value that must survive where the token is undefined,
 * as a module's stylesheet does on its own standalone page.
 */
function stripVarExpressions(value) {
  return value.replace(/var\((?:[^()]|\([^()]*\))*\)/g, '')
}

export function findViolations(cssText, filePath) {
  const violations = []
  const text = stripComments(cssText)

  for (const match of text.matchAll(DECLARATION_RE)) {
    const property = match[1].trim()
    const rawValue = match[2]
    const line = text.slice(0, match.index).split('\n').length

    if (property.startsWith('--')) continue

    const value = stripVarExpressions(rawValue)

    if (DURATION_PROPS.has(property)) {
      for (const durMatch of value.matchAll(DURATION_RE)) {
        const num = Number(durMatch[1])
        const ms = durMatch[2] === 's' ? num * 1000 : num
        const varName = DURATION_MS[ms]
        if (varName) {
          violations.push({ file: filePath, line, property, found: durMatch[0], expected: `var(${varName})` })
        }
      }
      if (EASE_STANDARD_RE.test(value)) {
        violations.push({
          file: filePath,
          line,
          property,
          found: value.match(EASE_STANDARD_RE)[0],
          expected: 'var(--ease-standard)',
        })
      }
      continue
    }

    for (const pxMatch of value.matchAll(PX_RE)) {
      const px = Number(pxMatch[1])
      const varName = tokenForPxProperty(property, px)
      if (varName) {
        violations.push({ file: filePath, line, property, found: pxMatch[0], expected: `var(${varName})` })
      }
    }
  }

  return violations
}

function findCssFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === TOKENS_DIR) continue
      out.push(...findCssFiles(join(dir, entry.name)))
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

function main() {
  const roots = cssRoots()
  const violations = []
  for (const root of roots) {
    for (const file of findCssFiles(root)) {
      const content = readFileSync(file, 'utf-8')
      violations.push(...findViolations(content, file))
    }
  }

  const scanned = roots.map((root) => `${root}/`).join(', ')
  if (violations.length > 0) {
    console.error(`Found ${violations.length} raw value(s) matching a design token in ${scanned}:\n`)
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} ${v.property}: ${v.found} -> use ${v.expected}`)
    }
    process.exit(1)
  }

  console.log(`No raw px/duration/easing value under ${scanned} matches a design token.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
