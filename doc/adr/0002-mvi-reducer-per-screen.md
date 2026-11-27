---
title: MVI-style state per screen
decision: Each screen owns its state as a plain object produced by a pure (state, action) => state reducer, with a unidirectional View → Action → reducer → State → View flow.
status: Accepted
date: 2026-05-21
sources: commit a9aa783 (Kotlin handlers); commit 1e8de5b, PR #50 (React rewrite, useReducer)
---

## Context

Screens hold non-trivial state (multi-round score entry, tie-break dialogs, merges, sync phases).
Logic buried in components cannot be unit-tested without mounting them.

## Decision

Model-View-Intent-inspired, one unit per screen:

- the state is a plain object, the actions a discriminated union, the reducer a pure function;
- each screen keeps its reducer, its types and its component together under
  `apps/scoreo/src/ui/<screen>/` (`<screen>Reducer.ts` + test, `<screen>Types.ts`, `<Screen>.tsx`
  + test);
- asynchronous work (use cases, network) runs in `submit*`/`load*` helpers that dispatch the
  resulting action, never inside the reducer.

In the Kotlin/JS version these were per-screen "handlers"; since the React rewrite (ADR-0016) each
screen uses React's `useReducer`.

## Consequences

- Reducers are tested in isolation, without rendering.
- A component stays a thin view over its state.
