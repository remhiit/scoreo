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
| 8 | **Theme** | Dark/light mode, toggle dans le header, détection auto navigateur, persistence localStorage | [`features/theme.md`](features/theme.md) |

## User Flow

1. **Home** → select ≥2 players → **New Match**
2. **Game Selection** modal → pick or create a game type → **Lancer la partie**
3. **Score Detail** → enter rounds → **Terminer la partie**
4. Back to **Home** — stats and selection reset

## Navigation

Top header bar (all screens):

| Element | Action |
|---------|--------|
| 🌙/☀️ | Toggle dark/light mode (toujours visible) |
| ← Back | Returns to Home (hidden on Home) |
| Title | Current screen name |
| ☰ Burger | Opens side menu |

Burger menu items:

| Icon | Label | Screen |
|------|-------|--------|
| 📊 | Stats | StatsScreen |
| 📋 | History | HistoryScreen |
| 📥 | Import | ImportScreen |
| 🎮 | Games | GameTypeScreen |
| ☁ | Sync | SyncScreen (visible uniquement si `CloudSyncRepository` configuré) |

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
