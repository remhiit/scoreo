import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

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
 * Every scoring module composes @scoreboards/design-system the way the host
 * does (doc/technical/module-contract.md § "A module wears Scoreo's look"):
 * the host's no-className/no-style/no-lucide rules over each
 * `packages/module-*` source, its component tests aside. Its `src/design/`
 * folder — where a module writes its game pieces' classes and CSS — lifts the
 * className rule alone: no inline style and no lucide-react there either.
 * A glob, not a list: a new module falls under the rule from its first file.
 * `module-api` is the host ↔ module contract, not a module
 * (scripts/module-packages.mjs holds the same definition).
 */
const MODULE_CONFIGS = [
  {
    files: ['packages/module-*/src/**/*.{ts,tsx}'],
    ignores: ['packages/module-api/**', 'packages/module-*/src/design/**', '**/*.test.tsx'],
    rules: COMPOSE_DS_RULES,
  },
  {
    files: ['packages/module-*/src/design/**/*.{ts,tsx}'],
    ignores: ['packages/module-api/**', '**/*.test.tsx'],
    rules: GAME_PIECE_RULES,
  },
]

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
  ...MODULE_CONFIGS,
)
