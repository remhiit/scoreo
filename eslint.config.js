import { existsSync } from 'node:fs'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Scoring modules that compose @scoreboards/design-system the way the host
 * does (doc/technical/module-contract.md § "A module wears Scoreo's look").
 * Listing `<id>` applies the host's no-className/no-style/no-lucide rules to
 * `packages/module-<id>/src/`, its component tests aside. Its `src/design/`
 * folder — where a module writes its game pieces' classes and CSS — lifts the
 * className rule alone: no inline style and no lucide-react there either.
 * Empty while the modules migrate one by one; a new module starts here.
 */
export const MODULES_COMPOSING_DS = []

// The host composes design-system components and nothing else: every visual
// decision (class, inline style, icon glyph) lives in packages/design-system.
const NO_CLASS_NAME = {
  selector: "JSXAttribute[name.name='className']",
  message:
    'This code composes @scoreboards/design-system components — no className. Add a prop or a component to the design system instead (or, in a module, a game piece under src/design/).',
}

const NO_STYLE = {
  selector: "JSXAttribute[name.name='style']",
  message:
    'This code composes @scoreboards/design-system components — no inline style. Add a prop or a component to the design system instead (a game piece under src/design/ styles itself through its CSS).',
}

const NO_LUCIDE = [
  'error',
  {
    paths: [
      {
        name: 'lucide-react',
        message:
          'Icons are part of the design system: use <Icon name="…" /> from \'@scoreboards/design-system\'.',
      },
    ],
  },
]

const COMPOSE_DS_RULES = {
  'no-restricted-syntax': ['error', NO_CLASS_NAME, NO_STYLE],
  'no-restricted-imports': NO_LUCIDE,
}

// A module's game pieces (src/design/) write classes, and nothing else the host forbids.
const GAME_PIECE_RULES = {
  'no-restricted-syntax': ['error', NO_STYLE],
  'no-restricted-imports': NO_LUCIDE,
}

/**
 * Two config blocks per listed module: the full rule set outside `src/design/`,
 * the game-piece rule set inside it. A listed id with no package behind it is
 * a typo, and an ignored typo would silently lint nothing: it throws instead.
 */
export function moduleComposingDsConfigs(moduleIds) {
  return moduleIds.flatMap((id) => {
    if (!existsSync(new URL(`./packages/module-${id}/`, import.meta.url))) {
      throw new Error(
        `eslint.config.js: MODULES_COMPOSING_DS lists "${id}" but packages/module-${id}/ does not exist.`,
      )
    }
    return [
      {
        files: [`packages/module-${id}/src/**/*.{ts,tsx}`],
        ignores: [`packages/module-${id}/src/design/**`, '**/*.test.tsx'],
        rules: COMPOSE_DS_RULES,
      },
      {
        files: [`packages/module-${id}/src/design/**/*.{ts,tsx}`],
        ignores: ['**/*.test.tsx'],
        rules: GAME_PIECE_RULES,
      },
    ]
  })
}

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/blob-report/**',
      // Kotlin/JS source kept as the oracle for the 1000 Sabords port. It is not
      // ours to lint, it is the thing the port is checked against — and it goes
      // away once the port lands.
      'legacy/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['apps/scoreo/src/**/*.{ts,tsx}'],
    rules: COMPOSE_DS_RULES,
  },
  ...moduleComposingDsConfigs(MODULES_COMPOSING_DS),
)
