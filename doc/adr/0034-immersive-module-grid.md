---
title: A module's grid is full-screen, with a single exit
decision: The module route renders without Scoreo's header, inside an immersive template whose bar shows only the manifest's displayName and a ✕ that calls the same onExit as the module, kept outside the module's error boundary.
status: Accepted
date: 2026-08-26
sources: commit fe10fff, issue #388, PR #392; commit 1150b7f, issue #389, PR #418
---

## Context

During a game, Scoreo's back arrow, title and burger menu only duplicated the exit a grid already
needs, and took space from the grid. A module that fails to load or throws must not leave the player
stuck.

## Decision

- `#/module/<moduleId>/<gameTypeId>/<ids>[/<matchId>]` is rendered full-screen: `AppShell` skips the
  header on that route and renders `ModuleScoreScreen` inside `ImmersiveTemplate`
  (`.sc-immersive` carries `padding-top: env(safe-area-inset-top)`).
- The immersive bar shows the manifest's `displayName` and a ✕, nothing else. It is a **sibling** of
  the `React.lazy` + `Suspense` + error-boundary tree, never a child: a module that fails to load,
  throws, or is unknown still leaves the ✕ standing.
- The ✕ calls the same `onExit` the module would call, and is the **one** visible way out of a
  grid; modules keep only their own "abandon" action (which clears the draft; the ✕ never does).
- `module-api` carries none of this: the bar needs nothing beyond `displayName`.

## Consequences

- Every other route keeps Scoreo's chrome.
