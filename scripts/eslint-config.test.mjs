import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import config, { MODULES_COMPOSING_DS, moduleComposingDsConfigs } from '../eslint.config.js'

// The module-composes-the-design-system rule, checked on real paths of the
// workspace (eslint.config.js § MODULES_COMPOSING_DS). `skyjo` stands in for a
// listed module, `tori-valley` for one still wearing its own look.
const ROOT = fileURLToPath(new URL('..', import.meta.url))

const SNIPPET = 'export const Piece = () => <div className="sj-card" />\n'

async function classNameErrors(filePath, listed) {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: [...config, ...moduleComposingDsConfigs(listed)],
  })
  const [result] = await eslint.lintText(SNIPPET, { filePath })
  return result.messages.filter((m) => m.ruleId === 'no-restricted-syntax')
}

describe('eslint.config.js — modules composing the design system', () => {
  it('starts with no module listed', () => {
    expect(MODULES_COMPOSING_DS).toEqual([])
  })

  it('refuses a className outside src/design/ of a listed module', async () => {
    const errors = await classNameErrors('packages/module-skyjo/src/ui/Round.tsx', ['skyjo'])
    expect(errors).toHaveLength(1)
    expect(errors[0].severity).toBe(2)
  })

  it('accepts a className inside src/design/ of a listed module', async () => {
    expect(await classNameErrors('packages/module-skyjo/src/design/Card.tsx', ['skyjo'])).toEqual(
      [],
    )
  })

  it('accepts a className in a listed module’s component test', async () => {
    expect(await classNameErrors('packages/module-skyjo/src/ui/Round.test.tsx', ['skyjo'])).toEqual(
      [],
    )
  })

  it('accepts a className in a module that is not listed', async () => {
    expect(
      await classNameErrors('packages/module-tori-valley/src/ui/Board.tsx', ['skyjo']),
    ).toEqual([])
  })

  it('still refuses a className in the host app', async () => {
    expect(await classNameErrors('apps/scoreo/src/ui/home/Home.tsx', [])).toHaveLength(1)
  })

  it('throws on a listed module with no package behind it', () => {
    expect(() => moduleComposingDsConfigs(['no-such-game'])).toThrow(
      /packages\/module-no-such-game\/ does not exist/,
    )
  })
})
