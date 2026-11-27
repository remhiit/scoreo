---
title: Configurable tie-break rules on game types
decision: GameType gains tieBreakRule (NONE, MANUAL_SELECTION, SECONDARY_SCORE), tieBreakCondition and tieBreakLabel, all defaulted so older data reads unchanged.
status: Accepted
date: 2026-06-23
sources: commit ef9e894; commit c537367 (resolution flow)
---

## Context

Many games end in ties and settle them differently: everyone tied wins, the players pick, or a
secondary metric decides.

## Decision

Schema change, `GameType` adds:

- `tieBreakRule: TieBreakRule = NONE`
- `tieBreakCondition: WinCondition = HIGHEST_SCORE`
- `tieBreakLabel: String? = null`

Backward compatibility: old JSON without these fields deserializes with the default values. No
explicit migration needed.

Behaviour: `NONE` — all tied players win; `MANUAL_SELECTION` — the user picks the winner(s)
(`Match.manualWinners`); `SECONDARY_SCORE` — a secondary metric decides
(`Match.secondaryPlayerScores`, compared with `tieBreakCondition`, labelled by `tieBreakLabel`).
The score-entry screen opens the matching tie-break dialog when needed.

## Consequences

- A module-bound game always reads `MANUAL_SELECTION`, the module's own winners (ADR-0045).
