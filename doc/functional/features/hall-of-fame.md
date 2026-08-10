# Hall of Fame

A separate, playful screen from Stats: instead of a factual ELO leaderboard,
it surfaces fun records between friends as "trophies". Nothing here is
persisted — every trophy is recomputed from `Match`/`GameType`/`Player` data
on every visit.

## Trophy Model

- `Trophy { id, title, description, holders: TrophyHolder[], unit? }`
- `TrophyHolder { playerId, name, value, detail? }`
- `unit` is an optional display suffix for the holder's value (e.g. `"ELO"`,
  `"days"`); omitted for trophies whose value is self-explanatory (counts,
  ratios, raw scores).
- A trophy with no eligible holder (not enough data) still renders, with
  `holders: []` — it's never omitted from the list.
- Ties produce multiple holders.
- Inactive players remain eligible: a record they set doesn't disappear
  because they were later deactivated.
- Matches referencing a non-existent game type are ignored, same as
  `GetPlayerStatsUseCase`.

## Trophy Catalog

| Code | Title | Rule |
|---|---|---|
| A1 | **The Invincible** | Longest all-time winning streak. A player's streak is computed over the matches they took part in, sorted by `date` ascending then `id` (deterministic tie-break at equal dates). |
| A2 | **Current Streak** | Consecutive wins up to the player's most recent match; `0` if that match was a loss. |
| A4 | **Streak Breaker** | When a player on a streak of N ≥ 2 loses a match, every winner of that match is credited with N. The trophy goes to the largest N; `detail` names the player whose streak was broken. |
| B2 | **The Collector** | Most wins in absolute value, all-time. |
| B3 | **The Regular** | Best wins/matches-played ratio, among players with at least `REGULAR_MIN_MATCHES` (10) matches. No holder if nobody reaches the threshold. `detail` shows the raw tally, e.g. `"8/10 matches"`. |
| C1 | **The Peak** | Highest ELO rating ever reached by a player, distinct from their current rating — built from `EloCalculator.computeHistory()`. `detail` is the date the peak was reached (e.g. `"15 Jan 2026"`). Value shown in `ELO`. |
| C3 | **King of the Hill** | Cumulated time spent leading the ELO ranking, in `days`. Between two consecutive `EloSnapshot`s, the leader of the earlier one capitalizes the gap between their dates; the leader of the last snapshot capitalizes up to today. A perfect tie for the lead at a snapshot splits the credit — every tied player capitalizes the period, consistent with the general ex-aequo rule. |
| D1 | **Game Record** | Best score ever recorded on a match, per game type. Direction follows the game type's `winCondition` (`HIGHEST_SCORE` → max, `LOWEST_SCORE` → min); `MANUAL` game types are excluded. Under the "All" filter the trophy lists one row per game type (`detail` names it); under a single game type filter, only that one row. |
| E1 | **Nemesis** | Among player pairs who have met at least `NEMESIS_MIN_MEETINGS` (5) times, the pair with the largest wins-minus-losses gap. The holder is the dominant player; `detail` names the dominated one. |
| F2 | **Player of the Month** | Most wins in the current calendar month (device's local month). A rotating trophy — legitimately empty early in the month. |

`REGULAR_MIN_MATCHES` and `NEMESIS_MIN_MEETINGS` are named constants exported
from `GetTrophiesUseCase`.

C1 and C3 are computed from `EloCalculator.computeHistory()` (never a
homegrown ELO recalculation), on the same game-type-filtered match list as
every other trophy — under a game type filter, the ELO history is
recomputed from scratch on that game type's matches only.

## Screen

- Same per-game-type filter mechanic as Stats: an "All" tab plus one tab per
  active game type.
- One card per trophy: title, description, and its holder(s) — name, value,
  and `detail` when present. A trophy with no holder shows an explicit empty
  state ("No record yet.") instead of being hidden.
- Reachable from the burger menu ("🏆 Hall of Fame").
