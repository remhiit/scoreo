#!/usr/bin/env node
// Folds the catalog build (dist/index.html + its assets) into one self-contained
// page, dist/catalog.html: the CSS and the JS inlined, no <html>/<head>/<body>
// of its own. That is the shape a preview host such as a Claude Artifact
// expects, so a catalog or a mockup can be published for review as one file.
// Run after `vite build` (`pnpm --filter @scoreboards/catalog build:preview`).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = new URL('../dist/', import.meta.url).pathname
const html = readFileSync(join(DIST, 'index.html'), 'utf8')

const asset = (pattern) => {
  const match = pattern.exec(html)
  if (!match) throw new Error(`single-file: ${pattern} not found in dist/index.html`)
  return readFileSync(join(DIST, match[1]), 'utf8')
}
const css = asset(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/)
const js = asset(/<script type="module"[^>]*src="\.\/([^"]+)"/)
const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? 'Catalogue Scoreo'

// A literal "</script" inside the bundle would close the inline script early.
const safeJs = js.replaceAll('</script', '<\\/script')

const page = `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`
writeFileSync(join(DIST, 'catalog.html'), page)
console.log(`single-file: dist/catalog.html (${Math.round(page.length / 1024)} KiB)`)
