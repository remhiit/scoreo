# Hall of Fame

A separate, playful screen from Stats: instead of a factual ELO leaderboard,
it surfaces fun records between friends as "trophies". Nothing here is
persisted — every trophy is recomputed from `Match`/`GameType`/`Player` data
on every visit.

## Trophy Model

- `Trophy { id, title, description, holders: TrophyHolder[] }`
- `TrophyHolder { playerId, name, value, detail? }`
- A trophy with no eligible holder (not enough data) still renders, with
  `holders: []` — it's never omitted from the list.
- Ties produce multiple holders.
- Inactive players remain eligible: a record they set doesn't disappear
  because they were later deactivated.
- Matches referencing a non-existent game type are ignored, same as
  `GetPlayerStatsUseCase`.

## Trophy Catalog (first batch)

| Code | Title | Rule |
|---|---|---|
| A1 | **The Invincible** | Longest all-time winning streak. A player's streak is computed over the matches they took part in, sorted by `date` ascending then `id` (deterministic tie-break at equal dates). |
| A2 | **Current Streak** | Consecutive wins up to the player's most recent match; `0` if that match was a loss. |
| A4 | **Streak Breaker** | When a player on a streak of N ≥ 2 loses a match, every winner of that match is credited with N. The trophy goes to the largest N; `detail` names the player whose streak was broken. |

More trophies (B2, B3, D1, E1, F2, C1, C3) land in dedicated follow-up
tickets — this batch only ships the socle (model + use case + screen) and
the three streak-based ones above.

## Screen

- Same per-game-type filter mechanic as Stats: an "All" tab plus one tab per
  active game type.
- One card per trophy: title, description, and its holder(s) — name, value,
  and `detail` when present. A trophy with no holder shows an explicit empty
  state ("No record yet.") instead of being hidden.
- Reachable from the burger menu ("🏆 Hall of Fame").
