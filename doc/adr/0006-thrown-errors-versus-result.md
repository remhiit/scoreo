---
title: Thrown domain errors, Result only where callers branch
decision: Use cases throw ValidationError/NotFoundError by default, and only the use cases whose callers branch on the outcome (CreateMatchUseCase, ImportMatchesUseCase) return an explicit Result<T, E>.
status: Accepted
date: 2026-06-10
sources: commit 8ccb2bf (CreateMatchUseCase returns a Result); commit 6ce2f12 (DomainError); commit 1e8de5b, PR #50 (TypeScript form)
---

## Context

Some callers only need the happy path or a top-level catch; others must inspect the failure to
render something (an import preview, a refusal reason) and should not rely on a try/catch.

## Decision

- **Thrown errors** — real `Error` subclasses (`ValidationError`, `NotFoundError`, union
  `DomainError`, `apps/scoreo/src/domain/model/errors.ts`) — for validation/lookup use cases such as
  `AddPlayerUseCase` or `ArchiveGameTypeUseCase`.
- **`Result<T, E>`** (`{ ok: true, value } | { ok: false, error }`, defined in `shared-domain`) for
  `CreateMatchUseCase` and `ImportMatchesUseCase`, so failure handling is enforced by the type
  checker at call sites.

This split is deliberate and consistent, not a mix chosen ad hoc.

## Consequences

- A new use case throws unless its callers need to branch on the outcome.
