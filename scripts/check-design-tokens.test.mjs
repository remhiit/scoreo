import { describe, expect, it } from 'vitest'
import { findViolations } from './check-design-tokens.mjs'

describe('findViolations', () => {
  it('flags a padding value that exactly matches a spacing token', () => {
    const css = '.card { padding: 12px; }'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 1, property: 'padding', found: '12px', expected: 'var(--space-3)' },
    ])
  })

  it('tolerates a padding value with no matching spacing token', () => {
    const css = '.card { padding: 6px; }'
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('only flags the matching number in a multi-value shorthand, ignoring the rest', () => {
    const css = '.select { padding: 6px 30px 6px 12px; }'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 1, property: 'padding', found: '12px', expected: 'var(--space-3)' },
    ])
  })

  it('flags a font-size value matching a text token (px equivalent of the rem scale)', () => {
    const css = '.title { font-size: 24px; }'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 1, property: 'font-size', found: '24px', expected: 'var(--text-xl)' },
    ])
  })

  it('tolerates an out-of-scale font-size', () => {
    const css = '.title { font-size: 18px; }'
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('flags border-radius: 999px as the pill token', () => {
    const css = '.chip { border-radius: 999px; }'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 1, property: 'border-radius', found: '999px', expected: 'var(--radius-pill)' },
    ])
  })

  it('does not apply the radius scale to a non-radius property with the same numeric value', () => {
    const css = '.card { padding: 6px; }' // 6 == --radius-sm, but padding uses the spacing scale
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('ignores properties outside the substitution scope (width, height, border, outline...)', () => {
    const css = '.box { width: 12px; height: 44px; border: 8px solid red; outline: 24px; background-position: right 11px center; }'
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('does not flag a negative px value (needs calc(), out of scope for a direct var() swap)', () => {
    const css = '.icon-btn { margin: -12px 0 -12px -16px; }'
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('does not flag a value already expressed as var(...)', () => {
    const css = '.card { padding: var(--space-3); }'
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('flags a transition duration that exactly equals --duration-fast', () => {
    const css = '.btn { transition: background 0.1s; }'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 1, property: 'transition', found: '0.1s', expected: 'var(--duration-fast)' },
    ])
  })

  it('tolerates a transition duration with no exact --duration-* match', () => {
    const css = '.btn { transition: opacity 0.2s; }'
    expect(findViolations(css, 'f.css')).toEqual([])
  })

  it('flags a cubic-bezier matching --ease-standard', () => {
    const css = '.btn { transition: background 160ms cubic-bezier(0.2, 0, 0, 1); }'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 1, property: 'transition', found: '160ms', expected: 'var(--duration-normal)' },
      {
        file: 'f.css',
        line: 1,
        property: 'transition',
        found: 'cubic-bezier(0.2, 0, 0, 1)',
        expected: 'var(--ease-standard)',
      },
    ])
  })

  it('reports the correct line number for a declaration further down the file', () => {
    const css = '.a {\n  color: red;\n}\n.b {\n  padding: 16px;\n}\n'
    expect(findViolations(css, 'f.css')).toEqual([
      { file: 'f.css', line: 5, property: 'padding', found: '16px', expected: 'var(--space-4)' },
    ])
  })

  it('ignores a declaration inside a comment', () => {
    const css = '.card {\n  /* padding: 16px; */\n  color: red;\n}\n'
    expect(findViolations(css, 'f.css')).toEqual([])
  })
})
