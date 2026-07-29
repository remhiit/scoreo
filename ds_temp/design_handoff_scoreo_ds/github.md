repo: remhiit/scoreo
branch: main

## Last sync
date: 2026-07-27
### Updated in this project
- Rebuilt every Scoreo screen on the Ludo Design System (Button/Input/Table/Modal from the DS bundle), bilingual EN/FR, 4 Catppuccin flavors × 14 accents.
- Redesigned Score entry: two-column standings grid (no per-headcount scrolling), a focused round-entry sheet, and wrapping editable round-history cards — replacing the original one-table-per-match layout.
- Filled in screens the DS didn't define yet: Stats (leaderboard + player detail), History, Games, Import, Sync, Theme picker, burger menu.

## Screen map
| Project screen (Scoreo Screens.dc.html) | Repo source |
|---|---|
| Home & players | src/ui/home/HomeScreen.tsx, PlayerListSection.tsx, AddPlayerField.tsx, GameSelectModal.tsx |
| Score entry (standings/sheet/history/tie-break/discard) | src/ui/scoredetail/ScoreDetailScreen.tsx, ManualSelectionDialog.tsx |
| Stats | src/ui/stats/StatsScreen.tsx |
| History | src/ui/history/HistoryScreen.tsx |
| Games | src/ui/gametype/GameTypeScreen.tsx, GameTypeForm.tsx |
| Import | src/ui/import/ImportScreen.tsx |
| Sync | src/ui/sync/SyncScreen.tsx |
| Theme picker | src/ui/theme/ThemePickerDialog.tsx, themeManager.ts |
| List rows / modals | src/ui/shared/ListItemRow.tsx, home/DeletePlayerModal.tsx, RenamePlayerModal.tsx |
