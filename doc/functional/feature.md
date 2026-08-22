# Features

| # | Feature | Description | File |
|---|---------|-------------|------|
| 1 | **Players** | Add, list, soft-delete with optional anonymization, per-player stats (wins/losses) | [`features/players.md`](features/players.md) |
| 2 | **Games** | Game types with configurable win conditions (highest score, lowest score, manual) | [`features/games.md`](features/games.md) |
| 3 | **Scoring** | Multi-round score table, auto-calculated totals, winner determination | [`features/scoring.md`](features/scoring.md) |
| 4 | **History** | Past matches list, player name resolution with deleted-player markers | [`features/history.md`](features/history.md) |
| 5 | **Stats** | Leaderboard ELO, head-to-head, per-game-type filter | [`features/stats.md`](features/stats.md) |
| 6 | **Import** | JSON import with preview, match-by-match execution, auto-creation of unknown entities | [`features/import.md`](features/import.md) |
| 7 | **Google Sync** | Cloud backup/restore via Google Drive App Data Folder, OAuth Token Model, conflict detection | [`features/sync.md`](features/sync.md) |
| 8 | **Theme** | Catppuccin: 4 flavors + swappable accent, picker in burger menu, auto browser detection, localStorage persistence | [`features/theme.md`](features/theme.md) |
| 9 | **Hall of Fame** | Playful trophies (streaks, volume, records, rivalry, monthly), recomputed on every visit, per-game-type filter | [`features/hall-of-fame.md`](features/hall-of-fame.md) |

## User Flow

### First Launch (new user)
1. **Splash screen** visible while app loads (logo + spinner)
2. **Home screen** shows "Getting started" guide banner:
   - Add players
   - Create a game type
   - Select ≥2 players and click "Start match"
3. Guide banner disappears after first player is added
4. Normal flow: select ≥2 players → **New Match**

### Subsequent Visits
1. **Home** → check for "Resume match in progress" banner:
   - If banner present: click to resume previous incomplete match (returns to score entry with saved data)
   - If no banner: select ≥2 players → **New Match** (normal flow)
2. **Game Selection** modal → pick or create a game type → **Start match**
   - A game a **scoring module** can count offers both ways in: **Play in Scoreo** (the generic
     score screen) or **Play on the module** (the module's own screen). A module augments a game,
     it never replaces it.
   - Modules with no game type of their own yet appear under **Available modules**, filtered to
     those that accept the number of players selected. Picking one creates its game type on the
     spot — nothing is created before that.
3. **Score Detail** → enter rounds (auto-saved after each score) → **Finish match**
   - A match scored on a module reopens **on that module**, with its own grid restored.
4. If cancelling mid-match: confirmation modal asks to discard or resume
5. Back to **Home** — stats and selection reset

## Navigation

Top header bar (all screens):

| Element | Action |
|---------|--------|
| ← Back | Returns to previous screen (hidden on Home). Contextual — see table below |
| Title | Current screen name (clickable → Home, except when already on Home) |
| ☰ Burger | Opens side menu (includes "🎨 Theme" — flavor + accent picker, and "🌐 Language" — EN/FR picker) |

Back button destinations:

| Screen | Condition | Destination |
|--------|-----------|-------------|
| `Home` | — | hidden |
| `History`, `Import`, `Games`, `Sync`, `HallOfFame` | — | Home |
| `Stats` | leaderboard visible | Home |
| `Stats` | player detail visible | leaderboard (clears selected player, no navigation) |
| `ScoreDetail` | new match (`matchId == null`) | Home |
| `ScoreDetail` | edit match (`matchId != null`) | History |
| `ModuleScore` | new match (`matchId == null`) | Home |
| `ModuleScore` | edit match (`matchId != null`) | History |

Note: Save and Cancel buttons in `ScoreDetail` follow the same rule as `←` (History if editing, Home if new match).

Burger menu items:

| Icon | Label | Screen |
|------|-------|--------|
| 🏠 | Home | HomeScreen |
| 📊 | Stats | StatsScreen |
| 📋 | History | HistoryScreen |
| 📥 | Import | ImportScreen |
| 🎮 | Games | GameTypeScreen |
| 🏆 | Hall of Fame | HallOfFameScreen |
| ☁ | Sync | SyncScreen (visible only if `CloudSyncRepository` is configured) |
| 🎨 | Theme | Opens `ThemePickerDialog` (flavor + accent, no navigation) |
| 🌐 | Language | Opens `LanguagePickerDialog` (EN/FR, no navigation) |

Screens:

| Screen | Route | Purpose |
|--------|-------|---------|
| `Screen.Home` | `/` | Player selection, FAB to start match |
| `Screen.History` | `/history` | View past matches |
| `Screen.Import` | `/import` | Import JSON match data |
| `Screen.Stats` | `/stats` | Leaderboard ELO, head-to-head, per-game filter |
| `Screen.Games` | `/games` | Manage game types |
| `Screen.Sync` | `/sync` | Google Drive cloud sync |
| `Screen.HallOfFame` | `/hall-of-fame` | Playful trophies (streaks, volume, records, rivalry, monthly), per-game-type filter |
| `Screen.ScoreDetail` | `/score/:gameType/:players` | Multi-round score entry |
| `Screen.ModuleScore` | `/module/:moduleId/:gameType/:players[/:matchId]` | A scoring module's own screen, loaded on demand (see [`../technical/module-contract.md`](../technical/module-contract.md)) |

## Technical notes

- All data is local-first (localStorage). No backend required.
- Domain models are serialized with `ignoreUnknownKeys = true` for forward/backward compatibility.
- Architecture: MVI-style (reducer/action/state, via `useReducer`) + hexagonal (Ports & Adapters).

## Manual functional recipe — React/TS build (TS-082)

Full checklist executed against `pnpm dev` (Chromium via Playwright, driving the real UI — no mocks) before the final cutover:

| Item | Result |
|---|---|
| Onboarding: first visit → add player → create game type → select ≥2 players → start match | ✅ "Getting started" banner shown empty-state, disappears after first player added |
| Multi-round scoring, autosave, resume after reload | ✅ Reloading mid-match restores every round and the running total exactly (verified with a 2-round draft) |
| Finish match with **manual** tie-break | ✅ Tied score → "Final decision" modal → pick winner → saved, W/L reflected on Home |
| Finish match with **secondary-score** tie-break | ✅ Tied score → "Secondary score?" modal → enter secondary scores → resolved, `manualWinners` set correctly |
| Cancel match with data-loss confirmation | ✅ "Discard scores?" modal on Cancel with scores entered; Discard returns to Home, scores cleared |
| History: list, filter by game type, delete with confirmation | ✅ Filter dropdown correctly hides non-matching games; delete shows a confirmation before removing |
| Stats: leaderboard, player detail, head-to-head, ELO | ✅ Leaderboard shows all players with ELO; player detail shows win rate and per-opponent head-to-head record |
| Import: v1.0 file, v1.1 file, duplicate skip, mismatched-details failure | ✅ Both format versions import correctly; re-importing the same file skips already-imported ids; a match whose `details` don't sum to the final score is reported as failed with its id |
| Theme: 4 flavors × 14 accents, persistence | ✅ Each flavor sets `data-theme`; each accent swatch (identified by `aria-label`) sets `data-accent`; both persist across a reload |
| Burger menu / header title-click navigation | ✅ Matches the table above exactly (title click → Home except already on Home; Sync entry absent since `VITE_GOOGLE_CLIENT_ID` is unset in this environment) |
| Google Drive Sync: login, push, pull, conflict + resolution | ⚠️ Not executable in this sandbox (no real Google account/OAuth client available); covered instead by the mocked unit/integration tests in `googleAuthService.test.ts` and `googleDriveSyncAdapter.test.ts` |
| PWA installability (Lighthouse PWA check) | ⚠️ Lighthouse CLI not available in this sandbox; manifest validity, icons, and service-worker registration behavior were verified directly (see TS-060/TS-061) instead of via a Lighthouse score |

No anomaly found in any item that could be executed end-to-end in this environment. The two items marked ⚠️ require a real Google account and/or Lighthouse, neither available here — they're the same limitation already noted when TS-060/TS-061/TS-023 were verified.
