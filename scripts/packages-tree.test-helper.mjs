// Test helper shared by the module guards' tests: writes a throwaway
// `packages/` tree, `{ 'module-a/src/design/Card.css': '…' }`, and returns its
// root. Not a test file itself (the root Vitest project runs `*.test.mjs`).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export function packagesTree(files) {
  const root = mkdtempSync(join(tmpdir(), 'packages-'))
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  return root
}
