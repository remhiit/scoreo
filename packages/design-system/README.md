# @scoreboards/design-system

Scoreo's design system, organised by Brad Frost's atomic layers. **Every visual
decision of the host app lives here**: tokens, CSS, and the React components that
carry them. The app only composes these components — no `className`, no `style`,
no stylesheet, no icon glyph of its own. `eslint.config.js` enforces it on
`apps/scoreo/src/` (see _The rule_ below).

The visual reference it implements is the Claude Design export in
[`ds_temp/scoreo-design/`](../../ds_temp/scoreo-design/README.md) (`Scoreo Atomic Design`,
`Scoreo Screens`, `Scoreo Écrans × Atomic`).

## Using it

```tsx
// once, in the app entry (apps/scoreo/src/main.tsx)
import '@scoreboards/design-system/styles.css'

// everywhere else
import { AppHeader, ListRow, ScreenTemplate, Stack } from '@scoreboards/design-system'
```

`styles.css` is the only stylesheet: it `@import`s the layers in atomic order, so
the cascade is the same in dev and in the bundle.

## The rule

The host composes; it never styles.

- **No `className` / `style`** in `apps/scoreo/src/**` — lint error.
- **No `lucide-react` import** in the app — icons are `<Icon name="trophy" />`, a
  closed set declared in [`src/atoms/icons.ts`](src/atoms/icons.ts).
- **Layout is a component too**: arrange things with `<Stack>` (direction, gap on
  the `--space-*` scale, alignment), never with margins.
- **Missing something?** Add a prop or a component here, with its CSS and a test —
  not a local workaround in the app.

The rule has no exceptions: every host screen composes the system.

## Scoring modules use it too

The scoring modules under `packages/module-*/` consume this package as well
(`workspace:*` dependency) and adopt Scoreo's look instead of a palette of their
own. A module listed in `MODULES_COMPOSING_DS` (`eslint.config.js`) is held to
the same rule as the app, with one exception: its `src/design/` folder, where it
may write `className` (never `style` or a `lucide-react` import) for the game
pieces no one else needs, scoped and prefixed, reading only the semantic tokens
— no `--ctp-*` value, no raw colour. A piece a second module needs moves here. See
[`doc/technical/module-contract.md`](../../doc/technical/module-contract.md) §
"A module wears Scoreo's look".

## Conventions

- Every class is prefixed `sc-` and owned by exactly one component
  (`.sc-row`, `.sc-row__title`, `.sc-row--selected`). The prefix keeps the system
  clear of the host's legacy sheets and of the scoring modules' own classes
  (`scripts/check-module-styles.mjs` checks modules against it).
- Components only read **semantic** tokens (`--surface-*`, `--text-*`,
  `--color-*`, `--space-*`, `--radius-*`); raw `--ctp-*` values stay in
  `semantic.css` (the accent swatches are the one exception — they _are_ the palette).
- A raw value that equals a token fails `scripts/check-design-tokens.mjs`.
- User-facing strings come in as props: the system has no i18n of its own.
  Defaults (`Close`, `Decrease`…) are English fallbacks only.

## Inventory

### 00 · Tokens — `src/tokens/`

Catppuccin in four flavors (`colors-*.css`, switched by `data-theme` on `<html>`),
the semantic layer and 14 accent presets (`semantic.css`, `data-accent`), type,
spacing, radius/shadow/motion. Foundations (`src/foundations/base.css`): reset,
page background, `--header-height`, `--screen-max`, `--screen-max-wide`.

### 01 · Atoms — `src/atoms/`

| Component                | Role                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                 | 4 variants × 3 sizes × 3 content modes (label, `icon` + `label` for icon-only, icon + label). `shape="pill"` for the one floating action, `width="fill" \| "full"` |
| `Icon`                   | Named icon from the closed set, `sm` 16 / `md` 20 / `lg` 30                                                                                                        |
| `Text`                   | Every piece of copy: `body`, `muted`, `hint`, `error`, `warning`, `success`, `strong`, `label`, `title`, `heading`, `caption`, `mono`                              |
| `Stack`                  | The layout primitive: direction, gap, align, justify, wrap, grow                                                                                                   |
| `TextInput`              | Text field with label, `invalid`/`error`/`hint`, `onEnter`                                                                                                         |
| `DateInput`              | Native date field (`YYYY-MM-DD`) with label, `layout` `stacked`/`inline`, `max`                                                                                    |
| `NumberField`            | Bare numeric field controlled as text (empty and `-` survive mid-edit), modes `cell`/`plain`, `invalid`, `min`/`max`                                               |
| `NumberInput`            | `stepper` (−, value, +), `plain`, or `cell` (60px history cell)                                                                                                    |
| `Select`                 | Native select with a themed chevron, `md` or `sm` (filter)                                                                                                         |
| `Checkbox`               | Label is the 44px tap target                                                                                                                                       |
| `Badge`                  | `neutral`, `accent`, `solid`, `success`, `warning`, `danger`, optional leading `label`                                                                             |
| `Score`, `Rank`, `Delta` | Monospaced tabular figures                                                                                                                                         |
| `Meter`                  | Win-rate bar                                                                                                                                                       |
| `Chip`                   | One word among a few (flavor, language)                                                                                                                            |
| `Swatch`                 | 26px accent dot in a 44px button                                                                                                                                   |

### 02 · Molecules — `src/molecules/`

| Component                              | Role                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ListRow` + `List`                     | The row that carries the app: title, subtitle, players, date, badge; `selectable`/`selected` tints the whole row; square `actions` flush to the edge   |
| `StandingsCard`                        | Rank, name, total, delta; `lead` bordered in the accent                                                                                                |
| `StatRow`                              | Leaderboard line: name, record, meter, value, `score` (accented ELO), trailing badge; `variant` `card` (default) or `line` (compact, inside a `Panel`) |
| `HistoryCell`                          | Name + score (or editable cell) on a two-column grid                                                                                                   |
| `SegmentedControl`, `Tabs`, `TabPanel` | Switch views inside a screen / filter a list; `TabPanel` is the card a tab shows                                                                       |
| `FormRow`, `ButtonRow`                 | Field + submit; buttons sharing a row                                                                                                                  |
| `DetailList` + `DetailRow`             | Label/value pairs, optionally `boxed`                                                                                                                  |
| `StatusLine`                           | success / warning / danger / info outcome, with detail lines                                                                                           |
| `FilterBar`                            | Label + compact select                                                                                                                                 |
| `EmptyState`                           | What is missing, how to fill it                                                                                                                        |
| `BulletList`                           | The records a destructive dialog affects, one per line                                                                                                 |

### 03 · Organisms — `src/organisms/`

| Component                       | Role                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AppHeader`                     | Back (or nothing), centred title, burger — fixed                                                                 |
| `StandingsGrid`                 | Two columns of standings cards                                                                                   |
| `RoundCard`                     | A past round, cells wrap downward                                                                                |
| `Panel`                         | Titled section on a card: title, `description`, `trailing`, children (Stats head-to-head, Hall of Fame trophies) |
| `Banner`                        | Accent container for onboarding steps or the resume action                                                       |
| `DropZone`                      | Dashed file target, hands back the `File`                                                                        |
| `Comparison` + `ComparisonCard` | Two symmetric cards (sync conflict)                                                                              |
| `SideMenu`                      | Slide-in navigation                                                                                              |
| `Dialog`                        | Centred dialog: title, body, `actions` footer                                                                    |
| `Sheet` + `SheetRow`            | Bottom sheet over readable context (round entry)                                                                 |
| `ActionBar`                     | Bottom bar: `center` (one pill) or `stack` (full primary over secondaries)                                       |
| `ThemePicker`                   | Flavor chips + accent swatches                                                                                   |

### 04 · Templates — `src/templates/`

| Component            | Role                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScreenTemplate`     | Header + 600px scrolling column + optional `actionBar` + `overlays`. Covers the "scrolling list" and "list + action bar" templates; "bottom sheet" and "centred dialog" are `Sheet` and `Dialog` passed as overlays |
| `ImmersiveTemplate`  | For a scoring module: a fine bar with the way out, the module fills the rest                                                                                                                                        |
| `WideLayout`         | The capped (1100px, `--screen-max-wide`), padded column an `ImmersiveTemplate`'s content is laid in — what a scoring module wraps its screen in                                                                     |
| `Columns` + `Column` | Two named regions side by side from 900px, stacked below (a module's scoreboard next to the turn being counted)                                                                                                     |

### 05 · Pages

The pages are the host's screens (`apps/scoreo/src/ui/*`), composed from the
layers above.

## Commands

```bash
pnpm --filter @scoreboards/design-system test
pnpm --filter @scoreboards/design-system typecheck
```
