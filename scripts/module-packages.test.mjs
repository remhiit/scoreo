import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MODULES_COMPOSING_DS } from '../eslint.config.js'
import {
  identityMismatches,
  legacyStylesheetsOfComposingModules,
  modulePackages,
  styleIsolationRows,
} from './module-packages.mjs'
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

describe('a module composing the design system has no legacy styles.css', () => {
  it('reports a listed module that still has one', () => {
    const root = packagesTree({
      'module-a/src/styles.css': '',
      'module-b/src/design/Piece.css': '',
      'module-c/src/styles.css': '',
    })
    expect(legacyStylesheetsOfComposingModules(['a', 'b'], root)).toEqual([
      join(root, 'module-a/src/styles.css'),
    ])
  })

  it('holds for every module in MODULES_COMPOSING_DS', () => {
    expect(legacyStylesheetsOfComposingModules(MODULES_COMPOSING_DS, PACKAGES)).toEqual([])
  })
})

describe('MODULES_COMPOSING_DS and the e2e identity agree', () => {
  const SPEC = `
const MODULES: Record<string, ModuleUnderTest> = {
  A: {
    game: 'A',
    reach: async (page) => {
      await expect(page.locator('.module-a .a-wrap')).toBeVisible()
    },
    surface: '.module-a .a-wrap',
    identity: 'own',
  },
  B: {
    game: 'B',
    reach: async () => {},
    surface: '.module-b .b-card',
    identity: 'scoreo',
  },
}
`

  it('reads the MODULES table row by row', () => {
    expect(styleIsolationRows(SPEC)).toEqual([
      { id: 'a', identity: 'own' },
      { id: 'b', identity: 'scoreo' },
    ])
  })

  it('throws rather than read a table it cannot pair up', () => {
    expect(() => styleIsolationRows(SPEC.replace("    identity: 'own',\n", ''))).toThrow(
      /2 surface\(s\) for 1 identity/,
    )
    expect(() => styleIsolationRows('const OTHER = {}\n')).toThrow(/no MODULES table/)
  })

  it('flags a row on either side of the pair', () => {
    const rows = styleIsolationRows(SPEC)
    expect(identityMismatches(rows, ['b'])).toEqual([])
    expect(identityMismatches(rows, [])).toEqual([{ id: 'b', identity: 'scoreo' }])
    expect(identityMismatches(rows, ['a', 'b'])).toEqual([{ id: 'a', identity: 'own' }])
  })

  it('holds for module-style-isolation.spec.ts, which guards every module', () => {
    const rows = styleIsolationRows(readFileSync(STYLE_ISOLATION_SPEC, 'utf8'))
    expect(rows.map(({ id }) => `module-${id}`).sort()).toEqual(
      modulePackages(PACKAGES).map((dir) => dir.slice(PACKAGES.length + 1)),
    )
    expect(identityMismatches(rows, MODULES_COMPOSING_DS)).toEqual([])
  })
})
