#!/usr/bin/env node
// Checks the Architecture Decision Records under doc/adr/ (format and life
// cycle: doc/adr/README.md) and keeps the README's index in step with them.
//
//   node scripts/check-adr.mjs          fails on any broken rule
//   node scripts/check-adr.mjs --write  regenerates the README index first
//
// Fails when: a number is missing or duplicated; dates decrease in number
// order; a required header field is missing; a status is not one of the three
// allowed values; a `supersedes` and the matching `Superseded by` do not
// answer each other or name an absent ADR; the README index differs from the
// files.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const ADR_DIR = join('doc', 'adr')
export const REQUIRED_FIELDS = ['title', 'decision', 'status', 'date']
export const INDEX_START = '<!-- adr-index:start -->'
export const INDEX_END = '<!-- adr-index:end -->'

const FILE_RE = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const REF_RE = /^ADR-(\d{4})$/
const SUPERSEDED_RE = /^Superseded by (ADR-\d{4})$/

/**
 * Reads the YAML-like header between the leading `---` lines: one
 * `key: value` per line, values taken verbatim (a `#` is part of the value,
 * since `sources` cites issues). Surrounding quotes are stripped.
 * Returns null when the file has no header.
 */
export function parseFrontMatter(content) {
  const lines = content.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return null
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (end === -1) return null
  const fields = {}
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1)
    fields[match[1]] = value
  }
  return fields
}

/** Every ADR file of `dir`, sorted by file name; non-ADR names are reported. */
export function loadAdrs(dir = ADR_DIR) {
  const adrs = []
  const errors = []
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.md') || name === 'README.md') continue
    const match = FILE_RE.exec(name)
    if (!match) {
      errors.push(`${name}: file name must be NNNN-short-title.md (lowercase, kebab-case)`)
      continue
    }
    const content = readFileSync(join(dir, name), 'utf-8')
    adrs.push({ file: name, number: Number(match[1]), fields: parseFrontMatter(content) })
  }
  return { adrs, errors }
}

export function adrId(number) {
  return `ADR-${String(number).padStart(4, '0')}`
}

function isValidDate(value) {
  const match = DATE_RE.exec(value)
  if (!match) return false
  const [y, m, d] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function supersededIds(value) {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** The rule violations of a set of ADRs (README index excluded). */
export function checkAdrs(adrs) {
  const errors = []
  const byNumber = new Map()
  for (const adr of adrs) {
    const list = byNumber.get(adr.number) ?? []
    list.push(adr)
    byNumber.set(adr.number, list)
  }

  for (const [number, list] of byNumber) {
    if (list.length > 1) {
      errors.push(
        `${adrId(number)} is used by several files: ${list.map((a) => a.file).join(', ')}`,
      )
    }
  }
  const max = Math.max(0, ...byNumber.keys())
  for (let n = 1; n <= max; n++) {
    if (!byNumber.has(n))
      errors.push(`${adrId(n)} is missing: numbers must run 0001, 0002, … without gaps`)
  }

  for (const adr of adrs) {
    if (!adr.fields) {
      errors.push(`${adr.file}: no front matter header (--- … ---)`)
      continue
    }
    for (const field of REQUIRED_FIELDS) {
      if (!adr.fields[field]) errors.push(`${adr.file}: missing required field "${field}"`)
    }
    const { status, date } = adr.fields
    if (status && status !== 'Accepted' && status !== 'Deprecated' && !SUPERSEDED_RE.test(status)) {
      errors.push(
        `${adr.file}: status "${status}" must be "Accepted", "Superseded by ADR-NNNN" or "Deprecated"`,
      )
    }
    if (date && !isValidDate(date))
      errors.push(`${adr.file}: date "${date}" is not a YYYY-MM-DD date`)
  }

  // Dates never decrease in number order.
  const ordered = [...adrs].filter((a) => a.fields && isValidDate(a.fields.date ?? ''))
  ordered.sort((a, b) => a.number - b.number)
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const curr = ordered[i]
    if (curr.fields.date < prev.fields.date) {
      errors.push(
        `${curr.file}: date ${curr.fields.date} is earlier than ${prev.file}'s ${prev.fields.date} — numbers follow the order of decisions`,
      )
    }
  }

  // supersedes <-> Superseded by answer each other.
  const unique = (n) => {
    const list = byNumber.get(n)
    return list && list.length === 1 ? list[0] : undefined
  }
  for (const adr of adrs) {
    if (!adr.fields) continue
    const self = adrId(adr.number)
    for (const ref of supersededIds(adr.fields.supersedes)) {
      const match = REF_RE.exec(ref)
      if (!match) {
        errors.push(`${adr.file}: supersedes "${ref}" must be ADR-NNNN`)
        continue
      }
      const target = unique(Number(match[1]))
      if (!target) {
        errors.push(`${adr.file}: supersedes ${ref}, which does not exist`)
        continue
      }
      if (target.fields?.status !== `Superseded by ${self}`) {
        errors.push(
          `${adr.file}: supersedes ${ref}, but ${target.file}'s status is "${target.fields?.status ?? ''}" instead of "Superseded by ${self}"`,
        )
      }
    }
    const superseded = SUPERSEDED_RE.exec(adr.fields.status ?? '')
    if (superseded) {
      const ref = superseded[1]
      const target = unique(Number(REF_RE.exec(ref)[1]))
      if (!target) {
        errors.push(`${adr.file}: status names ${ref}, which does not exist`)
      } else if (!supersededIds(target.fields?.supersedes).includes(self)) {
        errors.push(
          `${adr.file}: status names ${ref}, but ${target.file} does not declare "supersedes: ${self}"`,
        )
      }
    }
  }

  return errors
}

function escapeCell(text) {
  return String(text ?? '').replace(/\|/g, '\\|')
}

/** The index table, one row per ADR in number order. */
export function renderIndex(adrs) {
  const rows = [...adrs]
    .sort((a, b) => a.number - b.number)
    .map((adr) => {
      const f = adr.fields ?? {}
      return `| [${adrId(adr.number)}](${adr.file}) | ${escapeCell(f.title)} | ${escapeCell(f.status)} | ${escapeCell(f.date)} |`
    })
  return ['| ADR | Title | Status | Date |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

/** The README with its index block replaced; null when the markers are missing. */
export function withIndex(readme, index) {
  const start = readme.indexOf(INDEX_START)
  const end = readme.indexOf(INDEX_END)
  if (start === -1 || end === -1 || end < start) return null
  return `${readme.slice(0, start + INDEX_START.length)}\n\n${index}\n\n${readme.slice(end)}`
}

/**
 * Runs every check on `dir`; with `write`, regenerates the README index first.
 * Returns the list of errors (empty when everything holds).
 */
export function run(dir = ADR_DIR, { write = false } = {}) {
  const { adrs, errors } = loadAdrs(dir)
  errors.push(...checkAdrs(adrs))

  const readmePath = join(dir, 'README.md')
  if (!existsSync(readmePath)) {
    errors.push(`${readmePath} is missing`)
    return errors
  }
  const readme = readFileSync(readmePath, 'utf-8')
  const expected = withIndex(readme, renderIndex(adrs))
  if (expected === null) {
    errors.push(`${readmePath}: index markers ${INDEX_START} … ${INDEX_END} not found`)
  } else if (expected !== readme) {
    if (write) writeFileSync(readmePath, expected)
    else
      errors.push(
        `${readmePath}: the index differs from the ADR files — run node scripts/check-adr.mjs --write`,
      )
  }
  return errors
}

function main() {
  const write = process.argv.includes('--write')
  const errors = run(ADR_DIR, { write })
  if (errors.length > 0) {
    console.error(`Found ${errors.length} ADR problem(s) under ${ADR_DIR}/:\n`)
    for (const err of errors) console.error(`  - ${err}`)
    process.exit(1)
  }
  console.log(`ADRs under ${ADR_DIR}/ are consistent${write ? ' (index regenerated)' : ''}.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
