---
title: Skyjo is a score counter, not a simulator
decision: The Skyjo module records the total each player reveals at the end of a round and applies the scoring rules to those totals; it never models the cards, the grid or the deck.
status: Accepted
date: 2026-11-27
sources: commit 992ecf3, PR #508 (decision applied 2026-09-14); recorded here by issue #690
---

## Context

Skyjo is played with physical cards. The module was built (commit 992ecf3, PR #508) as a counter,
and the reason was only written in `packages/module-skyjo/doc/technical/architecture.md`, which issue
#690 removes. The module's code shows what it does, not why it stops there; without the reason, a
later change could start simulating the game. It is dated the day it is recorded, so that ADR numbers
keep their date order; the decision itself is older.

## Decision

The module takes exactly what a physical scorer needs: each player's round total, typed once per
round, plus who ended the round. From those it applies the rules (doubling for the player who ended
the round without the lowest score, running totals, end of game at the threshold, ranking). It has
no card grid, no flip animation, no column clearing and no deck.

A digital grid would duplicate what the players already have on the table and add a second source
of truth that must agree with the real cards. This mirrors 1000 Sabords' manual tab (a typed total,
not a simulated throw), without that module's calculator tab: Skyjo has nothing to compute from.

## Consequences

- Running totals, the ranking and the end of the game are derived from the rounds typed, never from
  card state.
- Simulating the cards would be a new decision, superseding this one.
