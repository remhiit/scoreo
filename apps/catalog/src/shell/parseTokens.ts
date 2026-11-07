/**
 * Reads token declarations straight out of the design system's stylesheets, so
 * the Tokens page shows what the CSS says — never a copy that could drift.
 */
export interface TokenDeclaration {
  name: string
  value: string
}

const DECLARATION = /^\s*(--[\w-]+):\s*([^;]+);/

/** Declarations of the first `:root { … }` block (the defaults, not the presets). */
export function rootDeclarations(css: string): TokenDeclaration[] {
  const start = css.indexOf(':root')
  if (start === -1) return []
  const open = css.indexOf('{', start)
  const close = css.indexOf('\n}', open)
  if (open === -1 || close === -1) return []
  return css
    .slice(open + 1, close)
    .split('\n')
    .map((line) => DECLARATION.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ name: match[1], value: match[2].replace(/\/\*.*\*\//, '').trim() }))
}

/** The declarations whose name starts with one of `prefixes`, in source order. */
export function withPrefix(tokens: TokenDeclaration[], ...prefixes: string[]): TokenDeclaration[] {
  return tokens.filter((token) => prefixes.some((prefix) => token.name.startsWith(prefix)))
}
