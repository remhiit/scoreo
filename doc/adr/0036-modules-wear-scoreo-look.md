---
title: A module wears Scoreo's look
decision: A module's screen composes the design system like the app, reads only its semantic tokens, and writes CSS only for its own game pieces in src/design/, scoped under .module-<moduleId> and prefixed with its own prefix.
status: Accepted
date: 2026-10-06
sources: commit 5bd4a11, issue #560, PR #565; commit 41c7684, issue #567, PR #597; commit efe54f8, PR #640
---

## Context

Modules came with palettes and stylesheets of their own. A stylesheet is never unloaded on
navigation, so a bare `:root` or element selector leaked into Scoreo for the rest of the session;
conversely Scoreo's CSS leaked into modules through shared class names (Torī Valley shipped with
player cards laid out in a row because Scoreo's `.card` reached it).

## Decision

- A module adopts Scoreo's identity: the user's flavor and accent, no palette of its own. Its screen
  composes `@scoreboards/design-system` (a `workspace:*` dependency) — no `className`, no `style`,
  no `lucide-react`, only the system's components and `<Icon />` — and reads only the semantic tokens
  (`--surface-*`, `--text-*`, `--color-*`, `--space-*`, `--radius-*`). A title is a `Panel`, `Dialog`
  or `Text` role, never a bare heading counting on a default.
- Game pieces specific to one game (a die face, a card, a score cell) live in the module's
  `src/design/`, the only place where `className` and CSS may be written — still no inline `style`,
  icons still through `<Icon />`. Its CSS: every rule scoped under `.module-<moduleId>` (carried by
  the module's root, itself a piece in `src/design/`); every class prefixed with the module's own
  prefix (`ms-`, `tv-`, `sj-`, `f7-`…), never `sc-`; only semantic tokens — no `var(--ctp-*)`, no raw
  colour, no raw value equal to a token.
- The scope keeps the module's CSS in; the prefix keeps the app's CSS out. Only the pair holds the
  border.
- **A component two modules need moves into the design system**: the second module wanting a piece
  is the signal to promote it (renamed `sc-`, with CSS and test, in the right atomic layer).
- Every piece a module's `src/design/index.ts` exports has its sheet on the catalog's "Pièces de jeu"
  page.

## Consequences

- Enforced by `eslint.config.js` (glob over `packages/module-*/src/**`, `src/design/**` lifting only
  the `className` rule), `scripts/check-module-styles.mjs`, `scripts/check-design-tokens.mjs`, the
  e2e `module-style-isolation.spec.ts` table (one row per module, required by
  `scripts/module-packages.test.mjs`) and the visual tests.
- Anything that must paint before scripts run belongs in `index.html`'s splash, not in a module
  stylesheet (which ships inside the JS chunk).
