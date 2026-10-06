import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  classNames,
  findColourViolations,
  findViolations,
  isDesignStylesheet,
  moduleStylesheets,
  selectors,
} from './check-module-styles.mjs'
import { packagesTree } from './packages-tree.test-helper.mjs'

const HOST = new Set(['card', 'empty', 'app-title'])

describe('classNames', () => {
  it('collects the class names a stylesheet styles', () => {
    expect([...classNames('.module-x .tv-card { color: red }')]).toEqual(['module-x', 'tv-card'])
  })

  // The stylesheets explain themselves at length, and their prose names the very
  // classes they are careful not to use.
  it('ignores class names that only appear in a comment', () => {
    expect([...classNames('/* never reuse .card here */ .module-x .tv-card {}')]).toEqual([
      'module-x',
      'tv-card',
    ])
  })
})

describe('selectors', () => {
  it('splits a comma-separated rule into its selectors', () => {
    expect(selectors('.module-x .a, .module-x .b { color: red }')).toEqual([
      '.module-x .a',
      '.module-x .b',
    ])
  })

  it('looks through an at-rule at the selectors inside it', () => {
    const css = '@media (prefers-color-scheme: dark) { .module-x { color: white } }'
    expect(selectors(css)).toEqual(['.module-x'])
  })
})

describe('findViolations', () => {
  it('passes a stylesheet that is scoped and prefixed', () => {
    const css = '.module-x { --a: 1px } .module-x .tv-card { display: block }'
    expect(findViolations(css, 'f.css', HOST)).toEqual([])
  })

  it('flags a rule that would style the whole host', () => {
    const css = '.module-x .tv-card {} input { border: 0 }'
    expect(findViolations(css, 'f.css', HOST)).toEqual([
      { file: 'f.css', kind: 'unscoped', detail: 'input' },
    ])
  })

  // The leak that shipped from #331 to #348: scoped, but sharing the host's name.
  it('flags a class name the host also styles, however well scoped', () => {
    const css = '.module-x .card { background: white }'
    expect(findViolations(css, 'f.css', HOST)).toEqual([
      { file: 'f.css', kind: 'collides-with-host', detail: '.card' },
    ])
  })

  it('never flags the module scope itself', () => {
    expect(findViolations('.module-card {}', 'f.css', new Set(['module-card']))).toEqual([])
  })
})

describe('moduleStylesheets', () => {
  it('finds a module’s legacy styles.css and every sheet under src/design/', () => {
    const root = packagesTree({
      'module-a/src/styles.css': '.module-a {}',
      'module-a/src/design/Card.css': '.module-a .a-card {}',
      'module-a/src/design/dice/Die.css': '.module-a .a-die {}',
      'module-a/src/design/Card.tsx': '',
      'module-api/src/styles.css': ':root {}',
      'design-system/src/styles.css': '.sc-x {}',
    })
    expect(moduleStylesheets(root)).toEqual([
      join(root, 'module-a/src/styles.css'),
      join(root, 'module-a/src/design/Card.css'),
      join(root, 'module-a/src/design/dice/Die.css'),
    ])
  })

  it('treats a missing styles.css or src/design/ as empty', () => {
    const root = packagesTree({
      'module-a/src/index.ts': '',
      'module-b/src/design/Piece.css': '.module-b .b-piece {}',
    })
    expect(moduleStylesheets(root)).toEqual([join(root, 'module-b/src/design/Piece.css')])
  })

  it('lets an unscoped rule under src/design/ be flagged', () => {
    const root = packagesTree({ 'module-a/src/design/Card.css': '.a-card { color: red }' })
    const [file] = moduleStylesheets(root)
    expect(findViolations(readFileSync(file, 'utf8'), file, HOST)).toEqual([
      { file, kind: 'unscoped', detail: '.a-card' },
    ])
  })

  it('lets a class shared with the design system under src/design/ be flagged', () => {
    const root = packagesTree({ 'module-a/src/design/Card.css': '.module-a .sc-card {}' })
    const [file] = moduleStylesheets(root)
    expect(findViolations(readFileSync(file, 'utf8'), file, new Set(['sc-card']))).toEqual([
      { file, kind: 'collides-with-host', detail: '.sc-card' },
    ])
  })
})

describe('findColourViolations', () => {
  it('passes a game piece coloured through semantic tokens only', () => {
    const css = '.module-a .a-card { background: var(--surface-card); color: var(--color-primary) }'
    expect(findColourViolations(css, 'f.css')).toEqual([])
  })

  it('flags a Catppuccin palette token', () => {
    const css = '.module-a .a-card { border-color: var(--ctp-mauve); }'
    expect(findColourViolations(css, 'f.css')).toEqual([
      { file: 'f.css', kind: 'palette-token', detail: 'border-color: var(--ctp-mauve)' },
    ])
  })

  it('flags every kind of raw colour, custom properties included', () => {
    const css = [
      '.module-a .a-card {',
      '  color: #fff;',
      '  --a-glow: #1e1e2eCC;',
      '  background: rgb(0 0 0);',
      '  outline-color: rgba(0, 0, 0, 0.5);',
      '  border-color: hsl(10 20% 30%);',
      '  box-shadow: 0 0 2px hsla(10, 20%, 30%, 0.4)',
      '}',
    ].join('\n')
    expect(findColourViolations(css, 'f.css').map(({ kind, detail }) => [kind, detail])).toEqual([
      ['raw-colour', 'color: #fff'],
      ['raw-colour', '--a-glow: #1e1e2eCC'],
      ['raw-colour', 'background: rgb('],
      ['raw-colour', 'outline-color: rgba('],
      ['raw-colour', 'border-color: hsl('],
      ['raw-colour', 'box-shadow: hsla('],
    ])
  })

  it('flags a custom property whose name holds a digit, under its full name', () => {
    const css = '.module-a .a-card { --a-shade2: #fff; --a-col-2: var(--ctp-red) }'
    expect(findColourViolations(css, 'f.css')).toEqual([
      { file: 'f.css', kind: 'raw-colour', detail: '--a-shade2: #fff' },
      { file: 'f.css', kind: 'palette-token', detail: '--a-col-2: var(--ctp-red)' },
    ])
  })

  it('ignores colours that only appear in a comment', () => {
    expect(
      findColourViolations('.module-a .a-x { /* was #fff */ color: var(--text) }', 'f.css'),
    ).toEqual([])
  })

  it('applies to src/design/ sheets, not to a legacy styles.css', () => {
    const root = packagesTree({
      'module-a/src/styles.css': '.module-a { --a-bg: #fff; color: var(--ctp-text) }',
      'module-a/src/design/Card.css': '.module-a .a-card { color: #fff }',
    })
    const [legacy, design] = moduleStylesheets(root)
    expect(isDesignStylesheet(legacy)).toBe(false)
    expect(isDesignStylesheet(design)).toBe(true)
    expect(findColourViolations(readFileSync(design, 'utf8'), design)).toEqual([
      { file: design, kind: 'raw-colour', detail: 'color: #fff' },
    ])
  })
})
