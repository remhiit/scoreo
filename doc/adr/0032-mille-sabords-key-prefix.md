---
title: 1kSaBord localStorage keys moved under the sabords_ prefix
decision: At startup Scoreo moves the four unprefixed 1kSaBord keys to sabords_<key>, never overwriting a different value, idempotently, and never reads their content.
status: Accepted
date: 2026-08-23
sources: commit 8510aad, issue #346, PR #347
---

## Context

GitHub Pages serves Scoreo and the standalone Kotlin 1kSaBord app from the **same origin**
(`remhiit.github.io`), and `localStorage` is per origin, not per path. 1kSaBord wrote four keys with
no prefix — `partie`, `joueurs_connus`, `historique_parties`, `theme` — while Scoreo prefixes
everything with `scoreo_`. No collision ever happened, but `theme` is a name any app on the origin
may claim. Same reasoning as the service worker's `CACHE_PREFIX` (ADR-0024), one level down.

## Decision

Migration: `apps/scoreo/src/infrastructure/migration/migrateMilleSabordsKeys.ts`, called once at
startup from `apps/scoreo/src/main.tsx`, before rendering.

1. For each of the four keys, read the unprefixed value; absent → next key.
2. Target `sabords_<key>` already holds a **different** value → do nothing, the source stays (nothing
   here may destroy data).
3. Target absent → write the value under `sabords_<key>`, then remove the original key.
4. Target identical to the source → a move interrupted between the two writes: remove the source.

Idempotent: a second run finds nothing to move and writes nothing. Every storage access is guarded:
an unavailable `localStorage` (Safari private mode, full quota, blocked site data) must never stop
the app from starting.

What it does not do: Scoreo never reads these keys' content and does not import 1kSaBord's history
into its own matches. To recover them, use 1kSaBord's Export button then Scoreo's JSON import.

## Consequences

- While the Kotlin app stays deployed on this origin, it no longer finds its data after a visit to
  Scoreo — it reads unprefixed names and starts from an empty history. Nothing is lost: everything is
  under `sabords_*`.
