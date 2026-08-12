# Stats

## Leaderboard

- Players sorted by ELO descending
- Each row shows: name, W/L record, win % bar, ELO number
- Click a player → head-to-head detail view
- Rows are wrapped in a `.list-container` (`ListContainer`), same 8px row spacing as other lists
- ELO figures (`.stats-elo`, `.stats-elo-badge`, `.stats-h2h-record`) use `--font-score` (monospace, tabular figures) so digits don't shift width row to row

## ELO Calculation

- Standard ELO with K=32, starting at 1200
- Processed chronologically across all matches
- Pairwise: each winner gains points from each non-winner participant

## Per-Game-Type Filter

- A tab bar at the top lets users filter by game type:
  - **All** — global ELO across all game types
  - **Game type name** — ELO computed using only matches of that type
- Head-to-head records also reflect the selected game type

## Player Detail

- Overall W/L record and win %
- Head-to-head list: opponent name, win bar, wins-losses record
- Trophies: below the head-to-head list, a "Trophies" section shows one
  badge per Hall of Fame trophy (see `hall-of-fame.md`) the selected player
  currently holds — icon, translated title, and value (unit included, e.g.
  `ELO`/days). Always rendered, even with no trophy: an explicit empty state
  replaces the badge row rather than hiding the section. A player ex aequo
  on a trophy gets the badge the same as a sole holder; a player holding
  the same trophy id more than once (D1's per-game-type record) gets one
  badge per record. Badges follow the screen's game-type tab, same as the
  leaderboard and head-to-head: under a game type filter, they're computed
  on that game type's matches only. Badge order: permanent records first
  (A1, A4, B2, B3, C1, C3, D1, E1), then rotating trophies (A2, F2).
