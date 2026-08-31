# Features

Torī Valley is a scoring module for the physical board game _La Vallée des Torī_ (Origames), played
inside [Scoreo](../../../../apps/scoreo). It doesn't replace the game — you still play with the
physical components — it just handles the end-of-game arithmetic, which involves a non-trivial
combinatorial rule (Torī series scoring) that's easy to get wrong by hand.

## Where the module starts and stops

Scoreo owns everything around the table: the players, the match history, the statistics, the export.
The module owns the game.

1. **Scoreo** — the player picks who is playing and starts a match on _La Vallée des Torī_. The
   module is handed those player ids and nothing else; their names come from `host.getPlayers()`.
2. **Match setup** (`MatchSetupScreen`) — pick which Objectif card variant (A/B/C) was dealt for each
   of the 5 landscapes. Everything defaults to `A`, so the screen can be confirmed as-is. The Torī
   card is always in play and has nothing to pick. **Start match** moves on; **Cancel** hands control
   back to Scoreo.
3. **Score entry** (`ScoreDetailScreen`) — for each player, enter what they ended the game with: Torī
   counts per color, their Parchemin value (if any), who (if anyone) holds the Pinceau, and for each
   landscape the counts its Objectif card asks for (the points are computed from them; any landscape
   can be switched to a hand-typed total). Each player's total VP updates live. Every change is written
   as a draft (`host.saveDraft`) so leaving mid-entry — today, the browser's back arrow; the module bar
   has no ✕ of its own yet — doesn't lose the cards dealt or the scores already typed. **Save match**
   hands the result back to Scoreo and clears the draft; **Cancel** clears it too and leaves without
   saving, the explicit way to abandon the game in progress and start clean next time.
4. **Scoreo again** — the match lands in Scoreo's history under _La Vallée des Torī_, with the winner
   the module ranked first. Reopening it from there comes back **on the module**, through Match setup
   showing the variants that match was recorded with, and the grid restored — a reopened match always
   wins over a leftover draft for the same players. Coming back to the module without reopening a match
   restores that draft instead, skipping Match setup: the cards were already dealt. A draft recorded for
   a different set of players is ignored and the grid starts blank.

Reopening, editing, deleting, exporting, and looking up a player's stats are all Scoreo's — see the
workspace's [`doc/functional/`](../../../../doc/functional/feature.md).

## Language

The module's strings live in the `tori-valley` i18next namespace and join Scoreo's instance when the
module loads. Which language they render in is Scoreo's choice, made once for the whole app.

See the individual feature docs for detail:

- [`features/scoring.md`](features/scoring.md)
- [`features/objectif-cards.md`](features/objectif-cards.md) — transcription of the 16 physical cards;
  13 of them are scored from the counts entered at score entry, the other two stay hand-typed
