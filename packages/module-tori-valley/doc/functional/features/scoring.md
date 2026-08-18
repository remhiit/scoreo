# Scoring

`src/ui/scoredetail/ScoreDetailScreen.tsx`, `scoreDetailReducer.ts`, `scoreDetailTypes.ts`. Domain logic lives in `src/domain/model/torii.ts` and `src/domain/model/match.ts` — see the rulebook (`LVDT_Rules-225x225mm_FR.pdf`, kept locally, not committed) pages 4–7 for the source rules.

For each player in the match, score entry captures four things that sum to their total VP (`scorePlayerResult()`):

## Torī (automatic)

Enter how many of each of the 5 Torī colors (green, red, blue, yellow, purple; 0–7 each) the player collected. The app computes the VP automatically (`scoreTorii()`): Torī are grouped into series of distinct colors — a series of _N_ different colors scores 0/0/2/4/7/10 VP for N=0..5 — and the same physical Torī can never count in two series. The greedy "peel one of every color still available, repeat" strategy used here always finds the maximum-scoring grouping (it reproduces the rulebook's own worked example: 8 Torī → 12 VP) — the user never has to plan the grouping themselves, just enter the raw counts.

## Objectif cards (manual entry)

Each landscape type (Bamboo, Cherry Blossom, Mountain, Water, Village) had one Objectif card selected at game setup, and each defines its own scoring rule for how that landscape's tiles are arranged on the player's board. There are 15 such cards (A/B/C difficulty variants per landscape), plus a Torī scoring reference card in the same deck.

The card texts are now transcribed in [`objectif-cards.md`](objectif-cards.md), but **the player's resulting point total per landscape is still entered manually**, read off the physical card — nothing computes them yet. Automating it is tracked as a follow-up (see the project backlog); that doc also flags the cards that would make it hard (some depend on neighbouring players' boards, others cross two landscapes).

## Parchemin (manual selection)

A player either didn't get a Parchemin (0 VP) or claimed one worth 3, 4, or 5 VP (the specific value depends on when in the game they claimed it and how many players there are) — select the value they ended with.

## Pinceau (single toggle)

Only one physical Pinceau token exists in the game, so at most one player per match can hold it — selecting a new holder clears it from whoever had it before (+2 VP for the holder).

## Winner / tie-break

`matchWinners(match)` (`src/domain/model/match.ts`) — highest total VP wins; ties are broken first by total Torī held, then by Pinceau possession; an unresolved tie is shared (multiple 🏆 in History).

## Not modeled

- **Sceau tokens** and their effects (Eau, Bambou, Montagne, Village, Cerisier) only affect what a player could place during the physical game — they don't contribute to the final tally directly, so there's no score input for them.
- **Solo mode** (scoring against a simulated opponent board with a difficulty bonus) isn't implemented — matches currently model 1–4 players entering their own results, not the solo compare-to-opponent flow.
- **Paper tile variant** (custom board shapes) has no effect on scoring and isn't modeled.
