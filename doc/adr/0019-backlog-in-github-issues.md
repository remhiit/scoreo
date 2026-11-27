---
title: Backlog in GitHub Issues, one issue per commit and PR
decision: The backlog lives in GitHub Issues (with the GitHub Project as a Kanban view), prioritised by P0–P3 labels, and each issue is delivered as one commit titled after it, in one PR that closes it.
status: Accepted
date: 2026-07-13
supersedes: ADR-0008
sources: commit 026fa00, PR #65
---

## Context

The `.task/` folder (ADR-0008) and GitHub Issues would have been two sources of truth that end up
diverging, and Issues are what the automation (labels, routines, PRs) can drive.

## Decision

- The backlog lives in GitHub Issues (+ the GitHub Project, Kanban view), not in `.task/` (removed).
- Priority: labels `P0`…`P3` (`P0` = most urgent).
- **Plan**: a feature or fix description becomes an issue (title, acceptance criteria, impacted
  files) with its priority label.
- **Develop**: take the first open, unassigned `P0` issue (else the next available priority),
  deliver it, open a PR referencing `Closes #N`.
- One commit per issue; the commit message is the issue's title.

## Consequences

- The automation pipeline uses labels as its event bus (`doc/workflows/automation-plan.md`).
