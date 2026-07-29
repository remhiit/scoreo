# Handoff: Scoreo — Ludo Design System screens

## Overview
Design reference gallery applying the **Ludo Design System** (Catppuccin-based, 4 flavors × 14 accents) across every Scoreo screen, plus a reworked Score Entry flow. The goal: bring Scoreo's UI onto this design system's tokens/components, and adopt the new Score Entry ergonomics for large player counts.

## About the design files
`Scoreo Screens.dc.html` is a **design reference built in HTML** — a prototype of the intended look, not production code to paste in. The task is to **recreate these screens inside the Scoreo React codebase** (its existing CSS-per-screen architecture under `public/css/`, its React components under `src/ui/`), using the Ludo Design System's real components (`_ds/.../components/forms/Button.jsx`, `Input.jsx`, `components/data/Table.jsx`, `components/overlays/Modal.jsx`) and tokens (`_ds/.../tokens/*.css`) as the styling source of truth.

## Fidelity
**High-fidelity.** Colors, spacing, radii, type and copy are final — pull exact values from `_ds/ludo-design-system-.../tokens/*.css` (Catppuccin palettes + semantic layer) rather than eyeballing the screenshots.

## Screens / views
All screens live in one file, `Scoreo Screens.dc.html`, in this order:

1. **Home & players** — roster with inline add, multi-select, first-launch onboarding banner (`.onboarding-guide`), resume-draft banner (`.draft-resume-banner`), game-select modal. Maps to `src/ui/home/*`.
2. **Score entry — reworked.** Was: one wide table (players as columns, rounds as rows) — broke down past ~4 players. Now:
   - **Standings** (`.gs-grid`, `.gs-card`): a 2-column card grid, one card per player (rank, name, total, last-round delta) — fits 8 players with zero scrolling.
   - **Round entry sheet** (`.sheet`): a bottom sheet opened via "Enter round N", one stepper-style input per player with their running total alongside.
   - **History** (`.hist-round`, `.hist-cells`): one card per round, players as wrapping chips inside — each score is an editable DS `Input` (`type="number"`, `stepper=false`, native spinner suppressed via `-webkit-appearance:none`/`.no-spin`). Wraps instead of horizontal-scrolling, so it never overflows the viewport.
   - Final-decision (tie-break) and discard-scores confirmations reuse the same selectable-row pattern as player selection elsewhere (`.list-item-label--selectable`), not checkboxes.
   Maps to `src/ui/scoredetail/*`.
3. **Stats** — leaderboard with ELO + win-rate bars, per-player detail with head-to-head. Not yet in the DS's `ui_kits/` — built from tokens only. Maps to `src/ui/stats/*`.
4. **History** — past matches, 3-line rows (name / winner-bolded score line / date), filter by game. Maps to `src/ui/history/*`.
5. **Games** — manage game types: add form, list, edit/detail modals. Maps to `src/ui/gametype/*`.
6. **Import** — JSON drop zone, preview, result summary (imported/skipped/failed). Maps to `src/ui/import/*`.
7. **Sync** — Google Drive connect, conflict resolution (local vs remote side-by-side), success state. Maps to `src/ui/sync/*`.
8. **Theme & navigation** — burger menu, theme picker (4 flavors × 14 accents), and the 4 flavors shown side by side. Maps to `src/ui/theme/*`.

## Interactions & behavior
- List rows: action buttons (edit/delete) are **square, flush against the row's right edge, full row height**, each with its own left border as a divider (`.list-item-actions button`) — not separately rounded icon buttons.
- The player-select area of a row fills the row edge-to-edge and is one tap target (`.list-item-label--selectable`), padded to the row's full bounds.
- Selects use a custom SVG chevron (`background-image`, `appearance:none`) — native arrows are never used, and are inset from the edge, not flush.
- Modals are the DS `Modal` component, mounted inside each phone frame (`.device` has `transform:translateZ(0)` so the modal's `position:fixed` scrim resolves inside the phone, not the real viewport). Cap the modal panel at `max-height:88%` of its container in this context.
- Round-history number inputs need `-webkit-appearance:none; appearance:none; -moz-appearance:textfield` plus their own `::-webkit-inner-spin-button` rule zeroed out — otherwise native spinner arrows clip 2-digit values in a narrow cell.

## State management
Not modeled here (static reference). In the real app, standings/history need: current round number, per-player per-round scores (array of round objects keyed by player id), running totals (derived), and — for the tie-break flow — a selected-winners set.

## Design tokens
Pull directly from `_ds/ludo-design-system-.../tokens/`:
- `colors-latte.css`, `colors-frappe.css`, `colors-macchiato.css`, `colors-mocha.css` — raw Catppuccin palette + `[data-theme="…"]` selectors.
- `semantic.css` — the semantic layer (`--surface-app`, `--text-body`, `--color-primary`, etc.) that components should reference — **note**: this design system's `semantic.css` only maps those tokens on `:root`, so an element-scoped `[data-theme]` retints raw `--ctp-*` colors but not surfaces/text. If Scoreo sets `data-theme` on anything other than `<html>`, replicate the re-map block from `Scoreo Screens.dc.html`'s `<style>` (the `[data-theme]{ --surface-app: var(--ctp-base); ... }` block) — otherwise consider filing this as a fix upstream in the DS itself.
- `typography.css`, `spacing.css`, `radius-shadow.css`.
- Default: Latte flavor, Mauve accent (`data-accent="mauve"`).

## Assets
No bitmap/photo assets. Icons are inline Lucide-style SVGs (stroke, 2px, 24×24 viewBox) — see any `<svg class="ic">` in the HTML for the exact paths; copy them as-is or swap for the Lucide package if the codebase already depends on it.

## Files in this package
- `Scoreo Screens.dc.html` — the full design reference (open directly in a browser).
- `_ds/` — the bound Ludo Design System folder: tokens, component source (`components/forms/Button.jsx`, `Input.jsx`, `components/data/Table.jsx`, `components/overlays/Modal.jsx`), and the compiled `_ds_bundle.js`.
- `github.md` — records the association with `remhiit/scoreo` (branch `main`) and a screen → repo-file map for what each screen replaces/extends.
