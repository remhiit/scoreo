import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

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
    // The host composes design-system components and nothing else: every visual
    // decision (class, inline style, icon glyph) lives in packages/design-system.
    files: ['apps/scoreo/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='className']",
          message:
            'The app composes @scoreboards/design-system components — no className. Add a prop or a component to the design system instead.',
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'The app composes @scoreboards/design-system components — no inline style. Add a prop or a component to the design system instead.',
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
    },
  },
)
