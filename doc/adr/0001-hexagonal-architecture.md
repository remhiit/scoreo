---
title: Hexagonal architecture (Ports & Adapters)
decision: Business logic lives in a framework-free domain and application layer that reaches storage and the network only through ports implemented by infrastructure adapters.
status: Accepted
date: 2026-05-21
sources: commit a9aa783 (initial scaffold, origin of the decision not found beyond it)
---

## Context

Scoreo started as a local-first PWA whose storage was expected to change (localStorage first, a
remote backend or cloud sync later). Business rules (winners, Elo, statistics, imports) had to be
testable without a browser, a framework or a storage engine.

## Decision

Three layers, dependencies pointing inwards:

- **Domain** (`apps/scoreo/src/domain/`): models and their schemas, pure functions, and the
  repository interfaces (`domain/port/`). No framework dependency.
- **Application** (`apps/scoreo/src/application/`): use cases, one business operation each, zero
  framework dependency. They depend on ports, never on adapters.
- **Infrastructure** (`apps/scoreo/src/infrastructure/`): adapters implementing the ports
  (`localStorage/`, `google/`, `browser/`, `events/`), plus in-memory fakes for tests (`testing/`).

The UI (`apps/scoreo/src/ui/`) is an adapter on the other side: it dispatches actions and calls use
cases. Concrete adapters and use cases are wired once at the root (`services/createServices.ts`,
exposed through `ServicesProvider`/`useServices()`).

## Consequences

- A repository interface goes in `domain/port/`, its implementation in `infrastructure/`; a use case
  goes in `application/`.
- Anything browser-specific a use case needs (connectivity, clocks, events) is a port too — e.g.
  `ConnectivityChecker`, which keeps `navigator.onLine` out of `application/`.
- Use cases are unit-tested against in-memory fakes, without jsdom storage.
- `application/` never imports `src/modules/`; an ESLint `no-restricted-imports` rule enforces it
  (see ADR-0045).
