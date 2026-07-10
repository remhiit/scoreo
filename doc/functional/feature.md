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
3. **Score Detail** → enter rounds (auto-saved after each score) → **Finish match**
4. If cancelling mid-match: confirmation modal asks to discard or resume
5. Back to **Home** — stats and selection reset

## Navigation

Top header bar (all screens):

| Element | Action |
|---------|--------|
| ← Back | Returns to previous screen (hidden on Home). Contextual — see table below |
| Title | Current screen name (clickable → Home, except when already on Home) |
| ☰ Burger | Opens side menu (includes "🎨 Theme" — flavor + accent picker) |

Back button destinations:

| Screen | Condition | Destination |
|--------|-----------|-------------|
| `Home` | — | hidden |
| `History`, `Import`, `Games`, `Sync` | — | Home |
| `Stats` | leaderboard visible | Home |
| `Stats` | player detail visible | leaderboard (clears selected player, no navigation) |
| `ScoreDetail` | new match (`matchId == null`) | Home |
| `ScoreDetail` | edit match (`matchId != null`) | History |

Note: Save and Cancel buttons in `ScoreDetail` follow the same rule as `←` (History if editing, Home if new match).

Burger menu items:

| Icon | Label | Screen |
|------|-------|--------|
| 🏠 | Home | HomeScreen |
| 📊 | Stats | StatsScreen |
| 📋 | History | HistoryScreen |
| 📥 | Import | ImportScreen |
| 🎮 | Games | GameTypeScreen |
| ☁ | Sync | SyncScreen (visible only if `CloudSyncRepository` is configured) |
| 🎨 | Theme | Opens `ThemePickerDialog` (flavor + accent, no navigation) |

Screens:

| Screen | Route | Purpose |
|--------|-------|---------|
| `Screen.Home` | `/` | Player selection, FAB to start match |
| `Screen.History` | `/history` | View past matches |
| `Screen.Import` | `/import` | Import JSON match data |
| `Screen.Stats` | `/stats` | Leaderboard ELO, head-to-head, per-game filter |
| `Screen.Games` | `/games` | Manage game types |
| `Screen.Sync` | `/sync` | Google Drive cloud sync |
| `Screen.ScoreDetail` | `/score/:gameType/:players` | Multi-round score entry |

## Technical notes

- All data is local-first (localStorage). No backend required.
- Domain models are serialized with `ignoreUnknownKeys = true` for forward/backward compatibility.
- Architecture: MVI (Handler/Intent/State) + hexagonal (Ports & Adapters).
