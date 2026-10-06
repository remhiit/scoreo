import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import config from '../eslint.config.js'

// The module-composes-the-design-system rule, checked through the real config
// on paths of the workspace (eslint.config.js § MODULE_CONFIGS). It covers
// every `packages/module-*` by glob: a module that does not exist yet is held
// to it exactly like the ones that do.
const ROOT = fileURLToPath(new URL('..', import.meta.url))

const SNIPPET = 'export const Piece = () => <div className="sj-card" />\n'
const STYLE_SNIPPET = 'export const Piece = () => <div style={{ color: "red" }} />\n'
const LUCIDE_SNIPPET =
  "import { Dice5 } from 'lucide-react'\nexport const Piece = () => <Dice5 />\n"

async function errors(snippet, filePath, ruleId) {
  const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: config })
  const [result] = await eslint.lintText(snippet, { filePath })
  return result.messages.filter((m) => m.ruleId === ruleId)
}

const classNameErrors = (filePath) => errors(SNIPPET, filePath, 'no-restricted-syntax')

describe('eslint.config.js — every module composes the design system', () => {
  it.each(['mille-sabords', 'skyjo', 'tori-valley', 'not-written-yet'])(
    'refuses a className outside src/design/ of packages/module-%s',
    async (id) => {
      const found = await classNameErrors(`packages/module-${id}/src/ui/Board.tsx`)
      expect(found).toHaveLength(1)
      expect(found[0].severity).toBe(2)
    },
  )

  it.each(['mille-sabords', 'skyjo', 'tori-valley', 'not-written-yet'])(
    'accepts a className inside src/design/ of packages/module-%s',
    async (id) => {
      expect(await classNameErrors(`packages/module-${id}/src/design/Piece.tsx`)).toEqual([])
    },
  )

  it('accepts the module root wrapper in src/design/, composed by the screen', async () => {
    const root =
      'export const ModuleRoot = ({ children }) => <div className="module-skyjo">{children}</div>\n'
    const screen =
      "import { ModuleRoot } from '../../design/ModuleRoot'\nexport const Screen = () => <ModuleRoot />\n"
    expect(
      await errors(root, 'packages/module-skyjo/src/design/ModuleRoot.tsx', 'no-restricted-syntax'),
    ).toEqual([])
    expect(
      await errors(
        screen,
        'packages/module-skyjo/src/ui/module/SkyjoModuleScreen.tsx',
        'no-restricted-syntax',
      ),
    ).toEqual([])
  })

  it('refuses the module root class written by the screen itself', async () => {
    const screen = 'export const Screen = () => <div className="module-skyjo" />\n'
    expect(
      await errors(
        screen,
        'packages/module-skyjo/src/ui/module/SkyjoModuleScreen.tsx',
        'no-restricted-syntax',
      ),
    ).toHaveLength(1)
  })

  it('refuses an inline style inside src/design/', async () => {
    const found = await errors(
      STYLE_SNIPPET,
      'packages/module-skyjo/src/design/Card.tsx',
      'no-restricted-syntax',
    )
    expect(found).toHaveLength(1)
    expect(found[0].message).toMatch(/no inline style/)
  })

  it('refuses a lucide-react import inside src/design/', async () => {
    const found = await errors(
      LUCIDE_SNIPPET,
      'packages/module-skyjo/src/design/Card.tsx',
      'no-restricted-imports',
    )
    expect(found).toHaveLength(1)
    expect(found[0].severity).toBe(2)
  })

  it('accepts a className in a module’s component test', async () => {
    expect(await classNameErrors('packages/module-skyjo/src/ui/Round.test.tsx')).toEqual([])
  })

  it('leaves the contract package and the design system alone', async () => {
    expect(await classNameErrors('packages/module-api/src/index.tsx')).toEqual([])
    expect(await classNameErrors('packages/design-system/src/atoms/Text.tsx')).toEqual([])
  })

  it('still refuses a className in the host app', async () => {
    expect(await classNameErrors('apps/scoreo/src/ui/home/Home.tsx')).toHaveLength(1)
  })
})
