---
title: The UI only composes the design system
decision: Every visual decision lives in packages/design-system, and the app writes no className, no style, no CSS and no lucide-react import — a missing visual need becomes a design-system component or prop, never a local workaround.
status: Accepted
date: 2026-10-01
sources: commit 9179224, PR #540; commits 4116dca–e5d7c13, PRs #541–#547 (screens migrated)
---

## Context

Visual decisions were spread across `theme.css`, ad-hoc classes and inline styles in screens, which
drifted from the design reference (the Claude Design export in `ds_temp/scoreo-design/`) and made
every screen restyle itself.

## Decision

- `packages/design-system/` (`@scoreboards/design-system`) holds **all** visual decisions:
  Catppuccin tokens, then atoms → molecules → organisms → templates as React components with CSS
  prefixed `sc-`.
- The app composes its components and nothing else: no `className`, no `style`, no stylesheet, no
  `lucide-react` glyph of its own. `apps/scoreo/src/main.tsx` imports the single stylesheet
  `@scoreboards/design-system/styles.css`.
- A missing visual need is a component or a prop added to the design system, with its CSS, its test
  and its catalog sheet (`apps/catalog/`) — never a local workaround.
- Only the design system's semantic tokens are read by components; `--ctp-*` palette tokens are
  referenced only by `semantic.css`.

## Consequences

- ESLint fails on `className`/`style`/`lucide-react` anywhere in `apps/scoreo/src/`, without
  exception; `scripts/check-design-tokens.mjs` fails on a raw value equal to a token in the design
  system's stylesheets.
- Every component has a catalog sheet, or `pnpm test` fails.
- The same rule reaches the modules (ADR-0036).
