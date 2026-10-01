import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Host files that still style themselves instead of composing
 * @scoreboards/design-system. The list only ever shrinks: a screen leaves it in
 * the PR that moves it onto the design system, and a new file can't join it.
 * Once empty, the host has no visual decision left of its own.
 */
const NOT_YET_ON_DESIGN_SYSTEM = [
  'apps/scoreo/src/ui/gametype/GameTypeForm.tsx',
  'apps/scoreo/src/ui/gametype/GameTypeScreen.tsx',
  'apps/scoreo/src/ui/halloffame/HallOfFameScreen.tsx',
  'apps/scoreo/src/ui/history/HistoryScreen.tsx',
  'apps/scoreo/src/ui/import/ImportScreen.tsx',
  'apps/scoreo/src/ui/scoredetail/ManualSelectionDialog.tsx',
  'apps/scoreo/src/ui/scoredetail/RoundEntrySheet.tsx',
  'apps/scoreo/src/ui/scoredetail/RoundHistoryList.tsx',
  'apps/scoreo/src/ui/scoredetail/ScoreDetailScreen.tsx',
  'apps/scoreo/src/ui/scoredetail/SecondaryScoreDialog.tsx',
  'apps/scoreo/src/ui/shared/ListContainer.test.tsx',
  'apps/scoreo/src/ui/shared/ListContainer.tsx',
  'apps/scoreo/src/ui/shared/ListItemRow.tsx',
  'apps/scoreo/src/ui/shared/LudoButton.tsx',
  'apps/scoreo/src/ui/shared/LudoModal.tsx',
  'apps/scoreo/src/ui/shared/LudoNumberInput.tsx',
  'apps/scoreo/src/ui/shared/LudoTextInput.tsx',
  'apps/scoreo/src/ui/stats/StatsScreen.tsx',
  'apps/scoreo/src/ui/stats/trophyIcons.ts',
  'apps/scoreo/src/ui/sync/SyncScreen.tsx',
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
    // The host composes design-system components and nothing else: every visual
    // decision (class, inline style, icon glyph) lives in packages/design-system.
    files: ['apps/scoreo/src/**/*.{ts,tsx}'],
    ignores: NOT_YET_ON_DESIGN_SYSTEM,
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
