---
title: Record decisions as ADRs
decision: Decisions the code cannot tell — what was removed, the rules of a contract, why a choice was made — are recorded as numbered, immutable Architecture Decision Records under doc/adr/, checked by scripts/check-adr.mjs.
status: Accepted
date: 2026-11-27
sources: issue #689
---

## Context

The functional and technical documentation is to be removed: skills will read the ADRs and the code
(Rémi's decision, 26/11/2026). The code does not say what was removed (old schema versions, deleted
fields), what a contract's rules are, or why a choice was made. Those decisions had to be extracted
before deleting the files that carried them.

## Decision

- One file per decision, `doc/adr/NNNN-short-title.md`, with a YAML front matter header (`title`,
  `decision`, `status`, `date`, optional `supersedes` and `sources`) followed by Context / Decision /
  Consequences, in English.
- Numbers are sequential, never reused; their order is the order of decisions.
- An accepted ADR is never rewritten in substance: changing one's mind is a new ADR with
  `supersedes`, the old one changing only its `status`; a decision no longer current with no
  replacement becomes `Deprecated`.
- A new ADR is written in the PR applying the decision; the merge is the acceptance (no "Proposed").
- An ADR only for what the code does not say.
- `scripts/check-adr.mjs` runs in CI and keeps `doc/adr/README.md`'s index generated.

## Consequences

- Past decisions were converted from `doc/technical/migrations.md`, `module-contract.md`,
  `architecture.md`, `doc/workflows/design-workflow.md` and `CLAUDE.md`, dated and sourced from git
  history. Purely descriptive type documentation moved into JSDoc in `packages/module-api/src/`.
- Switching skills and `CLAUDE.md` to read the ADRs is a separate issue.
