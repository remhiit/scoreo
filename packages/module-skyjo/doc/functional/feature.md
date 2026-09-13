# Skyjo — feature

## What the module is

A **score counter** for the physical card game Skyjo, not a digital simulator of it. Players deal
and play the real cards at the table; the module only tracks what the group already computes by
hand — each round's total per player — and applies the rules that turn those totals into a running
score and, eventually, a winner. There is no card grid, no flip animation, no deck: see
`doc/technical/architecture.md` for why that boundary was chosen deliberately over simulating the
game.

## The rules this module implements

Standard Skyjo:

- Each player starts a round with 12 face-down cards (a 3×4 grid) and flips/swaps them over the
  round, trying to end with the lowest sum of revealed values (cards range −2 to 12).
- A round ends the instant one player has revealed every one of their cards. Every other player
  gets one final turn, then the round is scored: every player adds up their revealed cards.
- **Doubling rule.** The player who ended the round has their round score doubled *unless* it is
  already the round's lowest (ties count as "the lowest" — an ender tied with someone else is not
  doubled). Every other player's round score is entered as-is.
- Round scores accumulate into a running total per player, round after round.
- **End of game.** The instant a round leaves any player's total at 100 or higher, the game ends
  immediately — no further rounds. The winner is the player with the **lowest** total.

## User flow

1. From Scoreo's "Select a game" screen, the players pick **Skyjo** among the available modules
   (first time only — after that it is bound to the game type and offered from the normal match
   flow).
2. The module opens straight onto the round-entry screen: no setup step, since there is nothing to
   configure before the physical cards are dealt.
3. After a round is played at the table, the players tap **who ended the round**, then type each
   player's revealed-card total (any integer, negative allowed) and tap **Valider la manche**. The
   module applies the doubling rule automatically and adds the result to the scoreboard.
4. A mistaken entry is corrected with **Annuler la dernière manche**, which drops the last round and
   returns to entry — it works on the round-entry screen and on the end screen alike, in case
   crossing 100 was itself the mistake.
5. **Abandonner** discards the game in progress without saving anything to Scoreo — a confirmation
   guards against an accidental tap, exactly like 1000 Sabords' own abandon flow.
6. The instant a round leaves someone at or past 100 points, the module shows its end screen: the
   winner (lowest total), the full standings, and **Enregistrer la partie**, which hands the result
   to Scoreo (`host.saveMatch`) and returns to the host, landing on History with the new match
   highlighted.
7. Reopening a finished Skyjo match from History resumes on the module with the full round-by-round
   table restored; re-saving updates that match instead of creating a second one.

## What is deliberately out of scope

- No simulated card grid, flipping, or column-clearing — that would turn a score counter into a
  full game engine, which the physical cards already are. See the technical doc for the reasoning.
- No support for house-rule variants (different end threshold, no doubling, etc.) — only the
  standard ruleset above.
