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
  the same trophy id more than once (D1's per-game-type record, or F3's one
  holder per month won) gets one badge per record — no cap, no grouping, no
  "+N" pill: a player who won 5 months gets 5 separate F3 badges. Badges
  follow the screen's game-type tab, same as the leaderboard and
  head-to-head: under a game type filter, they're computed on that game
  type's matches only. Badge order: permanent records first
  (A1, A4, B2, B3, C1, C3, D1, E1), then the acquired monthly hall of fame
  (F3), then rotating trophies (A2, F2).
  A badge for a dated (F3) holder appends its period to the title via the
  `hallOfFame.badgePeriod` i18n key (`"{{title}} — {{period}}"`), the
  period formatted short (`toLocaleDateString(i18n.language, { month:
  'short', year: 'numeric' })`, e.g. "Monthly Champions — Jul 2026"); a
  player's F3 badges are ordered most-recent month first, matching the
  holder order F3 already returns. Badges with no `period` (every other
  trophy) show just the plain title, as before.
  The Home player list shows the same badges as a bare count next to each
  player (see [`players.md`](players.md#screen-playerscreen)), computed on
  all game types; this screen is where that count is broken down.
