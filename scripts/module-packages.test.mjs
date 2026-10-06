import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { legacyStylesheets, modulePackages, styleIsolationIds } from './module-packages.mjs'
import { packagesTree } from './packages-tree.test-helper.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PACKAGES = join(ROOT, 'packages')
const STYLE_ISOLATION_SPEC = join(ROOT, 'apps/scoreo/e2e/module-style-isolation.spec.ts')

describe('modulePackages', () => {
  it('lists every module-* package but module-api, sorted', () => {
    const root = packagesTree({
      'module-b/package.json': '{}',
      'module-a/package.json': '{}',
      'module-api/package.json': '{}',
      'design-system/package.json': '{}',
      'module-stray.txt': '',
    })
    expect(modulePackages(root)).toEqual([join(root, 'module-a'), join(root, 'module-b')])
  })

  it('is empty when the packages folder is absent', () => {
    expect(modulePackages(join(packagesTree({}), 'nowhere'))).toEqual([])
  })
})

describe('no module keeps a legacy styles.css', () => {
  it('reports a module package that still has one', () => {
    const root = packagesTree({
      'module-a/src/styles.css': '',
      'module-b/src/design/Piece.css': '',
      'module-api/src/styles.css': '',
      'design-system/src/styles.css': '',
    })
    expect(legacyStylesheets(root)).toEqual([join(root, 'module-a/src/styles.css')])
  })

  it('holds for every module package', () => {
    expect(legacyStylesheets(PACKAGES)).toEqual([])
  })
})

describe('module-style-isolation.spec.ts guards every module', () => {
  const SPEC = `
const MODULES: Record<string, ModuleUnderTest> = {
  A: {
    game: 'A',
    reach: async (page) => {
      await expect(page.locator('.module-a .a-wrap')).toBeVisible()
    },
    surface: '.module-a .a-wrap',
  },
  B: {
    game: 'B',
    reach: async () => {},
    surface: '.module-b .b-card',
  },
}
`

  it('reads the MODULES table row by row', () => {
    expect(styleIsolationIds(SPEC)).toEqual(['a', 'b'])
  })

  it('throws rather than read a table it cannot find', () => {
    expect(() => styleIsolationIds('const OTHER = {}\n')).toThrow(/no MODULES table/)
    expect(() => styleIsolationIds('const MODULES = {\n  A: {},\n}\n')).toThrow(/no `.module-<id>`/)
  })

  it('holds one row per module package', () => {
    const ids = styleIsolationIds(readFileSync(STYLE_ISOLATION_SPEC, 'utf8'))
    expect(ids.map((id) => `module-${id}`).sort()).toEqual(
      modulePackages(PACKAGES).map((dir) => dir.slice(PACKAGES.length + 1)),
    )
  })
})
