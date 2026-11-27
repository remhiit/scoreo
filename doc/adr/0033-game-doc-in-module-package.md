---
title: A game's documentation lives in its module package
decision: Everything about the game a module counts, documentation included, lives in packages/module-<game>/ (doc under its doc/), while the workspace's doc/ keeps only what concerns the whole repository.
status: Accepted
date: 2026-08-24
sources: commit 320bdd0, issue #353, PR #357
---

## Context

Game rules, user guides, rule PDFs and card scans were scattered in the root `doc/`, away from the
code implementing them, and would outlive a removed module.

## Decision

A module package holds its source, its game pieces, its tests and its documentation under
`packages/module-<game>/doc/`: rules, user guide, resources, technical notes. The root `doc/` keeps
what belongs to the repository as a whole; the user guide (`doc/utilisateur/`) links to the module
guides.

## Consequences

- Deleting a module deletes its documentation.
- `scripts/check-doc-links.mjs` covers every `packages/*/doc/` as well as `doc/`.
