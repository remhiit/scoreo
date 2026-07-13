#!/usr/bin/env node
// Fails if any relative markdown link under doc/ points to a non-existent file.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'

const DOC_ROOT = 'doc'

function findMarkdownFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findMarkdownFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(path)
  }
  return out
}

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g

function isExternalOrAnchor(target) {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('#')
  )
}

let errors = []

for (const file of findMarkdownFiles(DOC_ROOT)) {
  const content = readFileSync(file, 'utf-8')
  const fileDir = dirname(file)

  for (const match of content.matchAll(LINK_RE)) {
    // Strip an optional `"title"` / '(title)' suffix, e.g. [text](path "title")
    const rawTarget = match[1].trim().split(/\s+(?=["'(])/)[0]
    if (isExternalOrAnchor(rawTarget)) continue

    const [pathPart] = rawTarget.split('#')
    if (!pathPart) continue

    const resolved = resolve(fileDir, pathPart)
    if (!existsSync(resolved)) {
      errors.push(`${file}: broken link -> ${rawTarget}`)
    }
  }
}

if (errors.length > 0) {
  console.error(`Found ${errors.length} broken link(s) under ${DOC_ROOT}/:\n`)
  for (const err of errors) console.error(`  - ${err}`)
  process.exit(1)
}

console.log(`All relative links under ${DOC_ROOT}/ resolve correctly.`)
