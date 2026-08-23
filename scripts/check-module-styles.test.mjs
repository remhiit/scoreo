import { describe, expect, it } from 'vitest'
import { classNames, findViolations, selectors } from './check-module-styles.mjs'

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
