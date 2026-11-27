---
title: The service worker only purges its own caches
decision: On activation, sw.js deletes only caches whose name starts with its own CACHE_PREFIX (scoreo-), never another app's on the same origin.
status: Accepted
date: 2026-08-21
sources: commit aa015b1, issue #309, PR #313
---

## Context

The Cache Storage API is scoped per origin, not per service-worker scope. Scoreo, Torī Valley
Scoreboard and 1000 Sabords were all deployed on `remhiit.github.io`; the `activate` handler deleted
every cache not named `CACHE_NAME`, so each app wiped the others' offline caches on every
activation.

## Decision

`CACHE_PREFIX` is `CACHE_NAME` minus its trailing `-v<N>` (i.e. `scoreo-`); the `activate` purge only
touches caches starting with it. `CACHE_NAME` is still bumped on breaking changes to the precached
shell.

## Consequences

- Same reasoning one level down for `localStorage` keys: everything Scoreo writes is prefixed
  (ADR-0032).
