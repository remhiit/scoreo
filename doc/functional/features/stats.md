# Stats

## Leaderboard

- Players sorted by ELO descending
- Each row shows: name, W/L record, win % bar, ELO number
- Click a player → head-to-head detail view

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
