# Flip 7 — feature

## What the module is

A **score calculator** for the physical card game Flip 7 (The Op Games). Players play the real deck at
the table; at the end of each round, each player taps the cards left in front of them — or **Bust** —
and the module applies the scoring order, keeps the running totals and calls the game. There is no
deck, no draw, no turn order: the module stops at the cards a player kept, which is all the score
depends on.

## The rules this module implements

Source: the publisher's FAQ (theop.games/pages/flip-7-faqs) and the rulebook (edition 3.1).

- **The deck.** Number cards 0 to 12 (one 0, then _n_ copies of each value _n_), five additive
  modifiers (+2, +4, +6, +8, +10, one of each), one ×2 modifier, and action cards (Freeze, Flip
  Three, Second Chance) that never score.
- **Bust.** A player who flips a Number card they already hold busts and scores **0** for the round —
  modifiers and bonus are lost too. Second Chance cancels a duplicate before it busts anyone, so it
  never reaches the score: a player saved by it just has no bust to tick.
- **Round score**, in this order (FAQ wording: "Add the value of your Number cards first, then
  multiply by 2 … then add any additional modifier cards, and finally … add the +15 bonus"):
  1. the sum of the player's Number cards;
  2. doubled if they hold the ×2 — the ×2 doubles **only** the Number cards;
  3. plus each +2…+10 modifier they hold;
  4. plus **15** if they hold seven different Number cards (a _Flip 7_), never doubled.
- A player may score with modifiers and no Number card; a lone ×2 scores 0.
- Number cards in a hand are all different (a duplicate is a bust), so a hand holds at most seven:
  the seventh ends the round. The module refuses an eighth.
- **End of game.** At the end of a round that leaves at least one player at **200** or more, the
  player with the most points wins. **Tie**: if two or more players share the lead past 200, every
  player keeps playing rounds until there is a single winner (FAQ). A sole leader past 200 ends the
  game even if players below are tied.

## User flow

1. From Scoreo's "Select a game" screen, the players pick **Flip 7** in the game list and tap
   **Start match** (2 to 18 players — see the manifest note below).
2. The module opens on the round entry: one panel per player, with a chip per Number card (0–12),
   per modifier (+2…+10, ×2) and a **💥 Bust** chip. The panel's badge shows the round score live;
   a Flip 7 is announced with its +15.
3. **Valider la manche** records every player's hand (an untouched panel scores 0) and clears the
   panels for the next round. The standings (with each player's last-round gain) and the round log
   (newest first, ★ for a Flip 7, 💥 for a bust) sit under the entry.
4. **Annuler la dernière manche** drops the last round — on the end screen too, in case crossing 200
   was the mistake. **Abandonner** discards the game after a confirmation, saving nothing.
5. A tie for the lead past 200 shows a notice and the next round is entered as usual.
6. The end screen names the winner, shows the final standings and the round log, and
   **Enregistrer la partie** (full width in the bottom bar, the design system's `ModuleGameActions`
   every scoring module shares) hands the result to Scoreo (`host.saveMatch`) — one round per Flip 7
   round, ranked by total.
7. Reopening a Flip 7 match from History resumes on the module with its rounds restored, hands
   included; re-saving updates that match.

The hand being entered survives a page reload (`host.saveDraft`).

## Manifest choices

- `minPlayers: 2` — the box says 3+, but no scoring rule depends on the player count, two-player
  games are common, and Scoreo cannot start a solo match anyway.
- `maxPlayers: 18` — the rulebook recommends a second deck past 18 players.
- `gameNames: ['Flip 7', 'Flip Seven']` — a game already created under either name (by hand or by a
  v1.1 import) is bound to the module the first time it is launched.

## What is deliberately out of scope

- Simulating the deck, the draws, Freeze / Flip Three / Second Chance: they decide _which_ cards a
  player keeps, never how those cards score.
- Checking modifiers across players (each modifier exists once per deck): with two decks, past 18
  players, two players may legitimately hold the same one.
- The _Flip 7 With a Vengeance_ variant, whose cards and scoring differ.
