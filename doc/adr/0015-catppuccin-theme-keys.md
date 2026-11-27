---
title: Catppuccin flavor and accent replace the dark/light toggle
decision: The theme becomes a Catppuccin flavor (scoreo_flavor) plus an independent accent (scoreo_accent), migrated once on read from the old scoreo_theme key, which is left in place.
status: Accepted
date: 2026-07-10
sources: commit e2347ad, PR #5
---

## Context

The binary dark/light toggle was replaced by the Ludo design system's Catppuccin theme: 4 flavors
(`latte`/`frappe`/`macchiato`/`mocha`) plus an independently swappable accent hue (14 presets,
default `mauve`).

## Decision

Storage change:

- old key `scoreo_theme`: `"dark"` or `"light"`;
- new keys `scoreo_flavor` (one of the 4 flavors) and `scoreo_accent` (one of the 14 hues).

Migration on read (`readInitialFlavor()`), the first time a user without `scoreo_flavor` loads the
app:

- `scoreo_theme == "dark"` → `"mocha"`;
- `scoreo_theme == "light"` → `"latte"`;
- neither key → `prefers-color-scheme: dark` decides (`mocha` or `latte`).

The accent defaults to `"mauve"` (no accent existed before). `scoreo_flavor`/`scoreo_accent` are
written immediately on first read, so the migration runs at most once per user. `scoreo_theme` is
**not** deleted — never read again once `scoreo_flavor` exists — so a rollback to a pre-Catppuccin
build still finds a valid value.

Behaviour: the header's toggle is gone; the theme is picked from the burger menu (4 flavor chips +
14 accent swatches). `data-theme` on `<html>` holds a flavor name instead of `"dark"`/absent, so any
code keying off `data-theme="dark"` is dead; semantic tokens are flavor-aware directly.

## Consequences

- A migration never destroys the old key when keeping it is free: rollback stays possible.
