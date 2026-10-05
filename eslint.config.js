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
 * `packages/module-<id>/src/`, except its `src/design/` folder — the one place
 * a module writes its game pieces' classes and CSS — and its component tests.
 * Empty while the modules migrate one by one; a new module starts here.
 */
export const MODULES_COMPOSING_DS = []

// The host composes design-system components and nothing else: every visual
// decision (class, inline style, icon glyph) lives in packages/design-system.
const COMPOSE_DS_RULES = {
  'no-restricted-syntax': [
    'error',
    {
      selector: "JSXAttribute[name.name='className']",
      message:
        'This code composes @scoreboards/design-system components — no className. Add a prop or a component to the design system instead (or, in a module, a game piece under src/design/).',
    },
    {
      selector: "JSXAttribute[name.name='style']",
      message:
        'This code composes @scoreboards/design-system components — no inline style. Add a prop or a component to the design system instead (or, in a module, a game piece under src/design/).',
    },
  ],
  'no-restricted-imports': [
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
  ],
}

/**
 * One config block per listed module. A listed id with no package behind it is
 * a typo, and an ignored typo would silently lint nothing: it throws instead.
 */
export function moduleComposingDsConfigs(moduleIds) {
  return moduleIds.map((id) => {
    if (!existsSync(new URL(`./packages/module-${id}/`, import.meta.url))) {
      throw new Error(
        `eslint.config.js: MODULES_COMPOSING_DS lists "${id}" but packages/module-${id}/ does not exist.`,
      )
    }
    return {
      files: [`packages/module-${id}/src/**/*.{ts,tsx}`],
      ignores: [`packages/module-${id}/src/design/**`, '**/*.test.tsx'],
      rules: COMPOSE_DS_RULES,
    }
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
