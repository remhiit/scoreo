---
title: Rewrite in React + TypeScript with zod schemas, stored format unchanged
decision: The Kotlin/JS (Compose HTML) app is rewritten in React + TypeScript (strict) built by Vite, with zod schemas replacing kotlinx.serialization while the JSON stored in localStorage stays identical.
status: Accepted
date: 2026-07-11
sources: commit 1e8de5b, PR #50; commit 6325ee0, PR #56 (production switch); commit f97528a, PR #58
---

## Context

The trade-offs of Kotlin/JS in this project (tooling, bundle, ecosystem) led to a full rewrite,
planned as tickets tracked as GitHub issues (label `migration-react`).

## Decision

- React (function components + hooks), TypeScript `strict: true`, Vite, Vitest + jsdom.
- (De)serialization moves from `kotlinx.serialization` (`Json { ignoreUnknownKeys = true }` + data
  class defaults) to [zod](https://zod.dev) schemas with a `.default()` per added field
  (`*.schema.ts`), which strip unknown keys natively — equivalent behaviour.
- The stored JSON format never changes at any step: same keys, same fields, same defaults.

## Consequences

- Users switch versions without any data migration; `serialization.contract.test.ts` holds the
  backward-compat cases (one per legacy shape) and the cross-migration test replays the oldest
  format (ADR-0017).
- MVI handlers became `useReducer` reducers (ADR-0002); Drive calls became native `async`/`await`
  (ADR-0011).
