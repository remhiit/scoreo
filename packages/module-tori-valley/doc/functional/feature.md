# Features

Torī Valley Scoreboard is a score calculator for the physical board game _La Vallée des Torī_ (Origames). It doesn't replace the game — you still play with the physical components — it just handles the end-of-game arithmetic, which involves a non-trivial combinatorial rule (Torī series scoring) that's easy to get wrong by hand.

## User flow

1. **Home** — add the players around the table (names only, reused across matches), then select 1–4 of them and tap **Start match**.
2. **Match setup** (`MatchSetup`) — pick which Objectif card variant (A/B/C) was dealt for each of the 5 landscapes. Everything defaults to `A`, so the screen can be confirmed as-is. The Torī card is always in play and has nothing to pick. Tap **Start match**; **Back** returns to Home with the players still selected.
3. **Score entry** (`ScoreDetail`) — for each selected player, enter what they ended the game with: Torī counts per color, their Objectif card results per landscape, their Parchemin value (if any), and who (if anyone) holds the Pinceau. Each player's total VP updates live. Tap **Save match**.
4. **History** — browse past matches, see final scores and the winner (🏆), edit a match's entered results, or delete it. Editing goes back through **Match setup** first, showing the variants that match was recorded with.

## Language

The app is available in English and French. On first launch it follows the browser's language; a selector in the header (visible on every screen) lets the player switch at any time, and the choice is remembered in `localStorage` (`tori_valley_language`) for the next visit.

See the individual feature docs for detail:

- [`features/players.md`](features/players.md)
- [`features/scoring.md`](features/scoring.md)
- [`features/objectif-cards.md`](features/objectif-cards.md) — transcription of the 16 physical cards; the selection is recorded per match, but nothing computes points from it yet
- [`features/history.md`](features/history.md)
