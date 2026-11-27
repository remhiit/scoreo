---
title: Players are archived, never deleted
decision: Deleting a player sets Player.active = false (default true) and keeps the player in match history, optionally blanking the name.
status: Accepted
date: 2026-06-10
sources: commit a2d89b8 (origin of the decision not found beyond it)
---

## Context

Matches reference players by id. Deleting a player would leave history, statistics and Elo
pointing at nothing.

## Decision

Schema version: v1.x → v1.2+.

Schema change: `Player` gains `active: Boolean = true` (`active: boolean`, `.default(true)` today).

- Backward compatibility: old JSON without `active` deserializes with `active = true`. No explicit
  migration needed.
- `GetPlayersUseCase` / `PlayerRepository.getAll()` exclude archived players by default;
  `getAll(includeInactive = true)` includes them for history rendering.
- The "Delete" action on the Home players list archives the player; the name can optionally be
  blanked (`anonymize = true` in `delete()`).

## Consequences

- Archived players disappear from active screens (Home, score entry) but stay in history.
- Same pattern later applied to game types (ADR-0013).
