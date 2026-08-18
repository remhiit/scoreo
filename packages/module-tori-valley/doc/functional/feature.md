# Features

Torī Valley Scoreboard is a score calculator for the physical board game _La Vallée des Torī_ (Origames). It doesn't replace the game — you still play with the physical components — it just handles the end-of-game arithmetic, which involves a non-trivial combinatorial rule (Torī series scoring) that's easy to get wrong by hand.

## User flow

1. **Home** — add the players around the table (names only, reused across matches), then select 1–4 of them and tap **Start match**.
2. **Score entry** (`ScoreDetail`) — for each selected player, enter what they ended the game with: Torī counts per color, their Objectif card results per landscape, their Parchemin value (if any), and who (if anyone) holds the Pinceau. Each player's total VP updates live. Tap **Save match**.
3. **History** — browse past matches, see final scores and the winner (🏆), edit a match's entered results, or delete it.

See the individual feature docs for detail:

- [`features/players.md`](features/players.md)
- [`features/scoring.md`](features/scoring.md)
- [`features/history.md`](features/history.md)
