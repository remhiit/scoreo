# Architecture

## UI Framework

**React 18** — function components + hooks, built with **Vite**.

- Generates real HTML DOM elements via the DOM renderer (`react-dom`)
- Written in TypeScript (`strict: true`)

## UI Pattern

**MVI-style — Model-View-Intent-inspired**

- Unidirectional data flow: `View → dispatch(Action) → reducer → State → View`
- State is a plain object, produced by a pure `(state, action) => state` reducer
- Predictable, easy to unit-test in isolation without mounting a component
- Each screen owns its state via React's `useReducer`, colocated under `src/ui/<screen>/`

## Application Architecture

**Hexagonal Architecture (Ports & Adapters)**

```
┌─────────────────────────────────────┐
│               UI Layer              │  ← React screens (src/ui)
│        (Actions & State)            │
└───────────────┬─────────────────────┘
                │ ports
┌───────────────▼─────────────────────┐
│            Domain Layer             │  ← Models, Use Cases
│   (Players, Games, Results, Stats)  │
└───────────────┬─────────────────────┘
                │ ports
┌───────────────▼─────────────────────┐
│         Infrastructure Layer        │  ← Storage adapter (local/remote)
│    (Local storage, Google Drive)    │
└─────────────────────────────────────┘
```

- **Domain layer** (`src/domain/`): pure TypeScript, no framework dependency — models (`Player`, `GameType`, `Match`) and their zod schemas, plus repository interfaces (`domain/port/`)
- **Application layer** (`src/application/`): use cases, zero framework dependency
- **UI adapter** (`src/ui/`): React screens, dispatching actions to reducers and calling use cases from `submit*`/`load*` helpers
- **Storage adapter** (`src/infrastructure/localStorage/`): `LocalStorage*Repository` classes (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)
- **Cloud sync**: `CloudSyncRepository` port (`domain/port/`), `GoogleDriveSyncAdapter` implementation (`infrastructure/google/`) via `fetch()` + async/await, OAuth Token Model via Google Identity Services
- **Auto-sync**: `DataChangeNotifier` port (`domain/port/`), `InMemoryDataChangeNotifier` implementation (`infrastructure/events/`) — the 3 synchronizable localStorage repositories call `notifyChanged()` after every write; `AutoSyncCoordinator` (`application/`) subscribes, debounces (~2.5s), checks connectivity via the `ConnectivityChecker` port (`domain/port/`, implemented by `BrowserConnectivityChecker` in `infrastructure/browser/` — keeps `navigator.onLine` out of `application/`), and pushes to Drive via `SyncUseCase.pushLocalData()`. See `doc/functional/features/sync.md`.
- **DI**: `src/services/createServices.ts` builds the concrete repositories + use cases once, exposed via `ServicesProvider`/`useServices()` (`src/services/ServicesContext.tsx`). The sync use case is `undefined` whenever no Google OAuth client id is configured (`VITE_GOOGLE_CLIENT_ID`), so the app runs fine without cloud sync (e.g. GitHub Pages without OAuth configured). `autoSyncCoordinator` is `undefined` under the same condition. The `DataChangeNotifier` itself is always built (the localStorage repositories depend on it regardless of whether sync is configured).

### Error modeling

Validation/lookup use cases throw real `Error` subclasses (`ValidationError`, `NotFoundError`, union type `DomainError` — `src/domain/model/errors.ts`) directly — e.g. `AddPlayerUseCase`, `ArchiveGameTypeUseCase`.

`CreateMatchUseCase`/`ImportMatchesUseCase` instead return an explicit `Result<T, E>` (`src/domain/result.ts`, `{ ok: true, value } | { ok: false, error }`), since their callers need to inspect success/failure without a try/catch (e.g. to render an import preview) — failure handling is enforced by the type checker at call sites rather than relying on a caught exception.

So: **thrown errors** for use cases where the caller just needs the happy path or a top-level catch, **`Result<T, E>`** for the two use cases whose callers branch on the outcome. This is a deliberate, consistent split — not a mix chosen ad hoc.

## Web Target

Vite dev server / production build, output to `dist/`. Entry point: `src/main.tsx` → `createRoot(...).render(<App />)`.

## Testing

Two separate suites, run by different `pnpm` scripts and CI jobs:

- **Unit/component (`pnpm test`)** — Vitest + `jsdom`. No real browser; covers reducers, use cases, and screen components. See "Tests" in `doc/reference.md`.
- **E2E (`pnpm test:e2e`)** — Playwright driving real Chromium against a production build (`pnpm build` + `pnpm preview`). Catches real-DOM/CSS rendering issues `jsdom` can't. Lives in `e2e/`, config at `playwright.config.ts`. CI installs Chromium (`playwright install --with-deps chromium`) in a dedicated `e2e` job.

## Source structure

- **`src/domain/`** — `model/` (types + zod schemas), `port/` (repository interfaces), `result.ts`
- **`src/application/`** — use cases (business logic, framework-agnostic)
- **`src/infrastructure/`** — `localStorage/` (adapters), `google/` (Drive sync, OAuth, config), `migration/` (Match v1→v2), `testing/` (in-memory fakes + mocks for tests)
- **`src/services/`** — root DI context
- **`src/i18n/`** — `i18n.ts` (init + language detection/persistence), `locales/{en,fr}.json` (dictionaries) — see "i18n" below
- **`src/ui/`** — one folder per screen (`<screen>Reducer.ts` + test, `<screen>Types.ts`, `<Screen>.tsx` + test), plus `shared/` (components), `theme/`, `navigation/`

Run `find src -type d` for the exhaustive package list.

## Styling

CSS files live in `public/css/` and are copied verbatim into the production build by Vite (no manual copy step). `styles.css` is the entry point, `@import`ing `theme.css`, `layout.css`, `home.css`, etc. — the browser resolves `@import` directives natively.
Uses CSS custom properties (design tokens), a fixed top header bar, and minimal component styles (cards, inputs, buttons, modals, score table).

### Design tokens — Catppuccin (Ludo design system)

`public/css/tokens/` holds the color/type/spacing/radius tokens, imported first from `styles.css` (before `theme.css` and the per-screen CSS files):

- `colors-latte.css` / `colors-frappe.css` / `colors-macchiato.css` /
  `colors-mocha.css` — the 4 Catppuccin flavors, raw `--ctp-*` values,
  each scoped to `[data-theme="…"]` (`latte` is also the `:root`
  default). Never referenced directly outside `semantic.css`.
- `semantic.css` — the only layer components/screens should read:
  semantic aliases (`--surface-app`, `--surface-card`, `--text-body`,
  `--border-subtle`, …) plus the independently swappable primary accent
  (`--color-primary`, default Mauve) and its 14 presets, opted into via
  `[data-accent="…"]` on `<html>`.
- `typography.css`, `spacing.css`, `radius-shadow.css` — type scale,
  4px spacing scale, radius/shadow/motion tokens.

Flavor and accent are switched by setting `data-theme`/`data-accent` attributes on `<html>` (see `src/ui/theme/themeManager.ts`).

`theme.css` never redefines the font stack itself — it references `var(--font-body)`/`var(--font-ui)` from `typography.css`, so the type scale stays the single source of truth.

Every screen references the semantic tokens directly — the shared `Ludo*` components (`src/ui/shared/LudoButton.tsx`, `LudoTextInput.tsx`, `LudoModal.tsx`) and each screen's own CSS all read `--color-primary`, `--surface-card`, `--text-body`, etc. `theme.css` holds only the splash screen, a couple of shared layout classes (`.card`, `.form-row`, `.select`, `.error-msg`, `.empty`, `.section-label`), and the one non-color layout constant that's still a plain custom property, `--header-height`.

**Guard-rail: `scripts/check-design-tokens.mjs`** (`pnpm check:design-tokens`, run in CI as the `design-tokens` job). `eslint.config.js` only lints `**/*.{ts,tsx}`, so nothing catches a raw `px`/duration value creeping back into `public/css/*.css` once it's been substituted for a token — this script does, mirroring `check-doc-links.mjs`'s pattern. It scans every declaration for `padding`/`margin`/`gap`/`font-size`/`border-radius` (and their longhands) plus `transition`/`animation`, and fails if a literal value exactly equals a `--space-*`/`--tap-target`/`--text-*`/`--radius-*`/`--duration-*` token or the `--ease-standard` easing — reporting file, line, and the expected `var(...)`. Values with no exact token equivalent (e.g. `13px`, `15px`, or `0.2s`/`0.3s`/`0.8s` transitions, none of which match `--duration-fast/normal/slow` exactly) are left alone, since substituting them would change the rendered layout/timing rather than just its expression. A negative px value (e.g. a negative-margin click-target trick) is likewise left alone — it would need a `calc(-1 * var(...))` wrapper, not a direct swap. `width`, `height`, `border`, `max-width`, `background-position`, `outline` etc. are never inspected.

## PWA (Progressive Web App)

Scoreo is installable as a native app on mobile and desktop.

Static assets in `public/`:

| File | Role |
|---|---|
| `manifest.json` | App name, icons, `display: standalone`, theme `#8839ef` |
| `sw.js` | Hand-written service worker — cache-first for hashed Vite assets, network-first (with cache fallback) for everything else same-origin |
| `icon-192.png` | Home screen icon (Android, iOS) |
| `icon-512.png` | Splash screen icon |

`index.html` (project root, source for Vite's HTML transform) carries the PWA meta tags, a `Content-Security-Policy` `<meta>` tag (see [Security](#security) below), the `#splash` div (hidden right after `createRoot(...).render(...)` in `src/main.tsx`), the dev-vs-prod service-worker registration script (`public/registerSw.js`, unregisters on `localhost`/`127.0.0.1`, registers `./sw.js` via `navigator.serviceWorker.register()` otherwise — kept as an external file rather than inline so the CSP's `script-src` can omit `'unsafe-inline'`), and the deferred Google Identity Services `<script>` tag.

`public/sw.js`'s `ASSETS` precache list only contains stable, non-hashed paths (`./`, `./index.html`, `./css/styles.css`) since Vite's JS/CSS bundle filenames are content-hashed. Its `fetch` handler only intercepts same-origin `GET` requests, split in two: hashed Vite assets (URL path containing `/assets/`) are served cache-first and populated in `CACHE_NAME` on first fetch (immutable — the hash guarantees freshness); everything else same-origin (navigations, `css/*.css`, `manifest.json`, icons) is served network-first with a cache fallback for offline, refreshing the cache on every successful network response so deployed changes reach existing users without a manual `CACHE_NAME` bump. `CACHE_NAME` is still bumped (`scoreo-v3`) on breaking changes to the precached shell, purging the previous cache via the existing `activate` handler. `vite.config.ts` sets `base: './'` so all root-relative hrefs are rewritten relative at build time, keeping the app deployable under any static-hosting subpath. `VITE_GOOGLE_CLIENT_ID` (consumed by `src/infrastructure/google/oauthConfig.ts`) is injected by Vite's native `import.meta.env` handling at build time.

Vite copies `public/` to the production output (`dist/`) natively — see [`deployment.md`](deployment.md).

**Shared UI components** (`src/ui/shared/`):
- `ListContainer` — wraps any list of `ListItemRow` items; applies `display:flex; flex-direction:column; gap:8px`. Accepts an optional `className` prop (e.g. `"list-container--spaced"` for `margin-top:16px`). Used by Home, Games, History screens.
- `ListItemRow` — single row with label, optional subtitle/players/date/badge slots, and optional action buttons (view/edit/delete), rendered as `LudoButton` (`ghost`/`danger`), square and flush against the row's right edge. Supports selectable mode (○/●), the clickable zone spanning the row's full bounds. The `badge` slot (with its `badgeLabel` accessible name) sits at the end of that zone — a click on it selects the row like any other part of it.

## Persistence

- **Current**: localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)
- **Import**: `ImportMatchesUseCase` reads the same repositories and writes through `MatchRepository.save()`, `GameTypeRepository.save()`, and `PlayerRepository.save()`
- **Cloud Sync**: Google Drive via `GoogleDriveSyncAdapter`. Stores a single `scoreo-data.json` in the invisible App Data Folder. Syncs players, game types, and matches. Drive API v3, `fetch()` + async/await, OAuth Token Model (GIS). See `SyncUseCase`, `src/ui/sync/syncReducer.ts`. Beyond the login-time `autoSync()`, every local mutation triggers a debounced push via `AutoSyncCoordinator`/`DataChangeNotifier` — see `doc/functional/features/sync.md`.

See [`deployment.md`](deployment.md) for CI/CD and deployment details.

## Security

- **OAuth access token: in-memory only, never persisted.** `GoogleAuthService.accessToken`/`expiresAt` live only as instance fields, for the lifetime of the page. `scoreo_sync_config` (`src/infrastructure/google/syncConfig.ts`) only stores `lastSyncTimestamp`/`lastSyncFileId` — no token, no email. This closes the plaintext-token-in-localStorage exposure tracked in issue #51 (a token readable via a devtools/extension/third-party-script dump of localStorage, without needing an active XSS payload at read time). `loadSyncConfig()` also purges any leftover `accessToken`/`expiresAt`/`email` from a pre-fix localStorage entry the first time it's read. Connected state is never derived from a persisted signal either (issue #108: the GIS Token Model never actually returns an `id_token`, so an email-based flag could never survive a reload) — `CloudSyncRepository.getStatus()` always attempts a silent GIS refresh when there's no in-memory token, and connected is decided purely by whether an access token ends up in memory. See `doc/functional/features/sync.md` for how the session is restored across reloads via this silent GIS refresh.
- **Content-Security-Policy** (`index.html` `<meta http-equiv>`): `default-src 'self'`, `script-src 'self' https://accounts.google.com` (no `'unsafe-inline'` — the service worker bootstrap lives in `public/registerSw.js` precisely to keep this true), `style-src 'self' 'unsafe-inline'` (React's inline `style={{...}}` props need it — narrower risk than script injection), `connect-src`/`frame-src` scoped to Google's OAuth/Drive endpoints. Defense-in-depth: reduces what an XSS payload can do, doesn't eliminate the underlying vulnerability class (no `DOMPurify`/sanitization layer exists in the codebase yet — there's currently no known injection point, but none has been audited either).

## Backward Compatibility

Data stored in `localStorage` must remain readable after an app update.

**Rule**: any change to a serialized domain model must be backward compatible with at least the previous version.

**Soft-delete**: `Player.active = false` (default `true`) hides the player from active screens (Home, ScoreDetail) but keeps them in match history. `getAll()` excludes inactive players by default. `getAll(includeInactive = true)` includes them for history rendering. The name can optionally be blanked (`anonymize = true` in `delete()`).

In practice:
- **Adding a field**: always provide a `.default()` in the field's zod schema so old data deserializes cleanly. zod strips unknown keys natively at validation, matching the old `ignoreUnknownKeys` behavior.
- **Renaming / removing a field**: requires a migration step — read old key, transform, write to new key. Document the migration in `doc/technical/migrations.md`.
- **Never change the type of an existing field** without a migration.

This applies to: `Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`.

**Current entity formats:**

| Entity | Fields |
|---|---|
| `Player` | `id: string` (UUID v4), `name: string`, `active: boolean` (default `true`) |
| `GameType` | `id: string` (UUID v4), `name: string`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule` (default `'NONE'`), `tieBreakCondition: WinCondition` (default `'HIGHEST_SCORE'`), `tieBreakLabel: string \| null` (default `null`), `active: boolean` (default `true`) |
| `Match` | `id: string` (UUID v4), `date: number` (epoch ms), `gameTypeId: string`, `playerScores: PlayerScore[]`, `manualWinners: string[]` (default `[]`), `secondaryPlayerScores: PlayerScore[]` (default `[]`), `rounds: PlayerScore[][]` (default `[]`) |
| `PlayerScore` | `playerId: string`, `score: number` |
| `WinCondition` | union: `'HIGHEST_SCORE'`, `'LOWEST_SCORE'`, `'MANUAL'` |

**Migration mechanism:** `LocalStorageMatchRepository.getAll()` runs `migrateMatches()` once per instance before the first read. It detects old-format data (string dates, non-UUID ids) and converts them, writing the migrated array back. Idempotent — a second call is a no-op. See `doc/technical/migrations.md` for details, and `src/infrastructure/crossMigration.test.ts` for the end-to-end backward-compat test replaying a realistic old-format export.

## Technical choice: fetch + async/await for Google Drive

`GoogleDriveClient` uses `window.fetch()` (standard browser REST API) with native `async`/`await`.

### Architecture

- `CloudSyncRepository` (port): all methods return a `Promise`
- `GoogleDriveClient`: wraps Drive REST calls via `window.fetch()`. Drive v3 splits its API across two base URLs: `https://www.googleapis.com/drive/v3/files` for metadata-only calls (`findFile`, `readFile`), and `https://www.googleapis.com/upload/drive/v3/files` (note the `/upload/` prefix) for any request that carries file content (`createFile`'s `uploadType=multipart`, `updateFile`'s `uploadType=media`) — sending an upload body to the metadata endpoint makes Google try to parse it as metadata JSON and fail.
- `SyncUseCase`: `async` method for each operation (`autoSync`, `resolveConflict`, `login`, `logout`)
- `src/ui/sync/syncReducer.ts`'s `submit*` helpers are `async` functions that call `SyncUseCase` and dispatch the resulting action
- `SyncScreen` itself stays a plain function component — the async work happens in the `submit*` helpers, not inline in the component

### Why this approach

- No blocking of the main thread (network calls are async)
- Uses standard browser APIs (`fetch`), no third-party library
- Native `Promise`/`async`/`await`, no coroutine runtime needed

### Theme

`ThemeProvider` (`src/ui/theme/ThemeContext.tsx`) is a React Context so the burger menu's theme picker and the rest of the app share the same live flavor/accent state; the context itself lives in `src/ui/theme/themeContext.ts` and the `useTheme()` hook in `src/ui/theme/useTheme.ts` (split out so each file only exports one thing — React Fast Refresh needs that to keep component state across edits). The pure logic (`readInitialFlavor`/`readInitialAccent`/`applyTheme`) lives in `src/ui/theme/themeManager.ts` and is directly unit-tested. CSS token files (`colors-{latte,frappe,macchiato,mocha}.css`, `semantic.css`, etc.) live in `public/css/tokens/`, native `@import` chain.

### i18n (internationalization)

`react-i18next` + `i18next`, initialized once in `src/i18n/i18n.ts` and imported before the first render in `src/main.tsx` (`i18next.use(initReactI18next).init({...})`) — the global `i18next` singleton is what `useTranslation()` reads by default, so no `<I18nextProvider>` wrapper is needed anywhere in the tree.

- **Dictionaries**: flat-ish nested JSON, one file per language — `src/i18n/locales/en.json` (reference/fallback, mirrors the text that used to be hardcoded in JSX) and `locales/fr.json` (full translation). Both share the same key shape, grouped by a `common` namespace (`cancel`/`close`/`delete`/`confirm` — reused across several modals) and one namespace per screen/component (`menu`, `languagePicker`, `home`, `gametype`, `history`, `scoreDetail`, `stats`, `hallOfFame`, `import`, `sync`). `resolveJsonModule` is enabled in `tsconfig.app.json` so these import as typed objects. Count-based labels (e.g. `import.imported`/`import.skipped`/`import.failed`, `sync.players`/`sync.gameTypes`/`sync.matches`) use i18next's built-in plural forms (`_one`/`_other` key suffixes, resolved via `Intl.PluralRules` per language) instead of manual string concatenation — `t('import.imported', { count })` picks the right form and interpolates `{{count}}`.
- **Persistence**: `detectInitialLanguage()` (`src/i18n/i18n.ts`) reads `localStorage.scoreo_lang` first, then falls back to the browser's language (`navigator.language`, two-letter prefix) if supported, else `en`. A `i18next.on('languageChanged', ...)` listener writes `scoreo_lang` on every change — components never touch `localStorage` directly, they just call `i18n.changeLanguage(lang)`.
- **Pattern**: every component with visible text calls `const { t } = useTranslation()` and renders `t('namespace.key')`; interpolated values use `t('home.playersSelected', { count })` against a `{{count}}` placeholder in the dictionary. A non-component call site (`GameSelectModalContainer.tsx`'s `domainErrorMessage()`, `syncReducer.ts`'s fallback error text for `errorMessage(e) ?? i18n.t('sync.syncFailed')`) imports the `i18next` default export directly and calls `i18next.t(...)` instead of the hook, since hooks are unavailable outside a component.
- **Language picker**: `LanguagePickerDialog` (`src/ui/shared/LanguagePickerDialog.tsx`), modeled on `ThemePickerDialog` — reuses its `.theme-picker-row`/`.theme-chip` CSS — opened from the burger menu's "🌐 Language" item (`src/App.tsx`). Each option shows a flag emoji (🇬🇧 for `en`, 🇫🇷 for `fr`) next to the language name, via a `.language-picker-flag` span — emoji only, no icon library (`lucide-react` has no per-country flag icons). Picking a language calls `i18n.changeLanguage()`; `useTranslation()`'s internal subscription re-renders every mounted component using `t()` immediately, no page reload.
- **Scope**: the Home screen (`src/ui/home/*.tsx`), the Games screen (`src/ui/gametype/GameTypeForm.tsx`, `GameTypeScreen.tsx`), the History screen (`src/ui/history/HistoryScreen.tsx`), the ScoreDetail screen (`src/ui/scoredetail/ManualSelectionDialog.tsx`, `RoundEntrySheet.tsx`, `RoundHistoryList.tsx`, `ScoreDetailScreen.tsx`, `SecondaryScoreDialog.tsx`), the Stats screen (`src/ui/stats/StatsScreen.tsx`), the Hall of Fame screen (`src/ui/halloffame/HallOfFameScreen.tsx`, reusing `stats.all` for its "All" filter tab), the Import screen (`src/ui/import/ImportScreen.tsx`), the Sync screen (`src/ui/sync/SyncScreen.tsx`, including its offline banner, all sync phases, and the conflict resolution view), the shared `LudoModal`'s close button, and the burger menu itself are migrated so far — reducers/use cases/domain error messages stay framework-agnostic and untranslated (e.g. `ValidationError` messages from `application/`, `leadHintLabel()` in `scoreDetailReducer.ts`), and the `winConditionLabel`/`tieBreakRuleLabel` enum labels (`domain/model/enums.ts`) are untranslated too since they live in the domain layer. Sync errors surfaced from the OAuth/Drive API layer (`SyncUseCase`) are passed through as-is and stay untranslated; only the reducer's own fallback text ("Sync failed"/"Login failed", used when the underlying error carries no message) is translated. Every other screen still has hardcoded English text pending its own follow-up migration issue.
