---
title: Backlog in the .task/ folder
decision: The backlog lives as one Markdown ticket per task under .task/<priority>/, in the repository.
status: Superseded by ADR-0019
date: 2026-06-12
sources: commit a1077ee (origin of the decision not found beyond it)
---

## Context

Work was planned and executed by LLM sessions, which needed a backlog they could read and update
from the repository itself.

## Decision

Tickets live as files in `.task/`, grouped by priority folder (`P0`…`P5`), named
`<priority>-<number>`; finished tickets are removed from the folder. Commits were titled after the
ticket (e.g. `P0-01: …`).

## Consequences

- Superseded by ADR-0019: the backlog moved to GitHub Issues, so there is only one source of truth.
