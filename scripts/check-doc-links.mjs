#!/usr/bin/env node
// Fails if any relative markdown link under doc/ points to a non-existent file.
import { readFileSync, existsSync, globSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DOC_ROOT = 'doc'

function findMarkdownFiles(dir) {
  return globSync(`${dir}/**/*.md`)
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
    const rawTarget = match[1].trim()
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
