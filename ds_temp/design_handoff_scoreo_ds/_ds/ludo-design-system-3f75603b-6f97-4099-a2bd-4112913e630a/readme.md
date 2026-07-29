# Ludo Design System

A small, modular design system for local-first, single-page browser apps — the first use case is **board-game score counters** (a "Belote tally", "Skyjo tally", etc.), so everything here is sized for that: compact screens, big tap targets, numbers that don't jitter, and a handful of components rather than a sprawling kit.

There is no attached codebase, Figma file, or existing brand — this system was authored from scratch against the brief below (kept verbatim since it defines every decision made here):

> Je veux créer un design simple et modulaire pour des applications qui fonctionneront en local dans un navigateur et qui s'adapte aussi bien à un téléphone qu'à un ordinateur. Le design system devra supporter des thèmes qui pourront être redéfinis par les applications pour adapter les couleurs au contexte de l'application. Pour les thèmes je pense à une définition en palette de couleur comme le fait Catppuccin. Les premiers composants dont j'ai besoin sont des boutons, des tableaux, des modales, et des inputs (texte et nombre). Par défaut on utilise le thème Catppuccin Latte avec Mauve en couleur principale, changeable par les apps.

No source materials means no logo, no product screenshots, no existing icon set — see the ICONOGRAPHY section below for how that gap is handled.

## Index

- `styles.css` — the one file consuming apps link. Imports everything under `tokens/`.
- `tokens/` — Catppuccin palettes (`colors-latte.css`, `colors-frappe.css`, `colors-macchiato.css`, `colors-mocha.css`), the semantic + accent layer (`semantic.css`), `typography.css`, `spacing.css`, `radius-shadow.css`.
- `components/forms/` — `Button`, `Input`
- `components/data/` — `Table`
- `components/overlays/` — `Modal`
- `ui_kits/score-counter/` — the flagship demo app (also a Starting Point)
- `guidelines/` — foundation specimen cards (colors, type, spacing, brand) shown in the Design System tab

## Components

- **Button** — primary / secondary / ghost / danger, 3 sizes, icon-only mode for +/- steppers.
- **Input** — text fields and number fields; numbers default to a −/+ stepper sized for one-thumb tapping.
- **Table** — the scoreboard grid: one column per player, one row per round, pinned totals row.
- **Modal** — centered dialog with scrim, for add-player / confirm-reset / rules flows.

### Intentional additions
None beyond the brief's four families — Button/Input/Table/Modal is the complete inventory requested. (The +/- stepper is a *mode* of Input, not a separate component.)

## Theming

Themes are Catppuccin flavors, switched with `<html data-theme="latte|frappe|macchiato|mocha">` (Latte is the default — no attribute needed). Every component reads only *semantic* tokens (`--color-primary`, `--surface-card`, `--text-body`, …), which are aliases onto the active flavor's raw `--ctp-*` values — so switching flavor retints everything with zero component changes.

The **primary accent is independently swappable** from the flavor, per the brief: apps set `<html data-accent="blue">` (14 presets, one per Catppuccin hue) or simply override `--color-primary` to any CSS color directly — both work, because `--color-primary` is just a CSS custom property. Default is `data-accent="mauve"` on Latte, per the spec.

See the "Theme + Accent Switching" and "Catppuccin Flavors" cards under **Colors**, and the live switcher in the Score Counter UI kit.

## Content fundamentals

- **Voice**: utilitarian and warm, never corporate. These are tools you open mid-game, not a product with a marketing voice. Copy should read like something a friend hosting game night would write on a whiteboard: "Add player", "Next round", "Reset scoreboard?" — imperative, short, no exclamation points.
- **Person**: direct address in French ("tu"), imperative in UI copy in both languages ("Ajouter un joueur", not "Vous pouvez ajouter un joueur"). English UI copy mirrors this: imperatives over full sentences.
- **Casing**: sentence case everywhere — buttons, headers, labels. No ALL CAPS except tiny (≤11px) uppercase micro-labels (e.g. table column headers, the theme/accent switcher labels), which use letter-spacing to stay legible at that size.
- **Numbers**: scores are the content. They're set in monospace tabular figures and given the largest, boldest type on any screen — the player's name is secondary to their score.
- **Confirmations**: destructive actions (resetting a scoreboard) get one plain-language confirmation sentence, not a paragraph of legalese — see the Modal card / Score Counter's "Reset scoreboard?" dialog.
- **Emoji**: none. Board-game names and scores carry enough personality on their own; emoji would compete with the accent color for attention.
- **Vibe**: quiet, fast, "get back to the game" — every string should be answerable in one glance, since it's read at a table between turns, often on someone else's phone.

## Visual foundations

- **Color**: exactly one palette family — Catppuccin — across 4 flavors (Latte default) with one swappable accent hue (Mauve default). No colors are invented outside this palette; a new "brand color" for an app is just picking a different Catppuccin hue via `data-accent`, or in rare cases overriding `--color-primary` directly.
- **Type**: system font stack only (`system-ui` for UI text, `ui-monospace` for scores) — see the "Score Numerals" caveat below for why. One scale, `--text-xs` → `--text-3xl`; scores always take the largest weight/size available on a given screen.
- **Backgrounds**: flat only. No gradients, no imagery, no texture/grain, no patterns — surfaces are solid Catppuccin tones (`base`/`mantle`/`surface0`/`surface1`). This is a utility tool, not a marketing surface.
- **Animation**: minimal and quick. Buttons: background/transform transition only (~100ms). Modal: fade + scale-in scrim/panel (~160ms), `cubic-bezier(0.2,0,0,1)` — a "settle", not a bounce. Nothing loops or plays decoratively.
- **Hover state**: buttons darken toward the surface tone one step (primary → `color-mix` 6–12% black; secondary/ghost → `--surface-hover`). No lightening, no glow.
- **Press state**: `scale(0.97)` + a further darken step (`--color-primary-active`). Tactile, not color-only, since these apps are touched mid-game on a phone.
- **Borders**: thin (1px), always a neutral `--ctp-surface*` tone — never the accent color as a border. Focus rings are the one place the accent appears as an outline (2px, 30% opacity accent + solid accent border).
- **Shadows**: very quiet — `--shadow-sm` for resting cards, `--shadow-md`/`lg` reserved for the Modal only. Shadows read as "this sits above the surface", never as a heavy drop-shadow.
- **Corners**: soft but modest — 6/10/14px (sm/md/lg), pill for icon buttons and chips. Nothing sharp, nothing overly rounded/bubbly.
- **Cards**: `--surface-card` fill, 1px `--border-subtle`, `--radius-lg`, `--shadow-sm`. No colored left-border accent strip (an explicitly avoided AI-slop trope) — the score's own accent color is the only pop of color inside a card.
- **Transparency/blur**: only the modal scrim (`--scrim`, ~60% crust + 2px blur), to hold focus on the dialog without hiding the board entirely.
- **Layout**: single-column, centered, `max-width: 720px` container — these apps are used one- or two-handed on a phone at a table as much as on a laptop, so nothing assumes a wide desktop layout. Player cards wrap responsively; the table scrolls horizontally past a handful of players rather than shrinking illegibly.
- **Imagery**: none — no photography, no illustration. If an app wants a board-game "hero" image later, it should be user-supplied (the game's own box art/photo), not a generic illustration from this system.

## Iconography

No icon system today. All "icons" so far are **glyph characters set in the UI font** (`−`, `+`, `×`) sized like the surrounding text — not SVGs, not an icon font, not emoji. This was a deliberate choice for a from-scratch, no-source-material system: it keeps the system dependency-free (no icon font/SVG sprite to ship) while covering the only two interactions that need a glyph today (score steppers, modal close).

If a future component needs a real icon (e.g. a settings gear, an undo arrow), the recommendation is to adopt **Lucide** (CDN or self-hosted SVGs) — same stroke weight (2px), same minimal aesthetic as everything else here — rather than hand-drawing new marks. Flag this as a substitution when it happens, since no icon set was specified in the brief.

No logo is included: no brand/logo asset was provided for this run. Wherever a mark would go (e.g. an app's header), render the app or game's name in plain type — do not invent a logo.

## Sources
None attached — no Figma file, codebase, or brand deck was provided for this run. If one exists, attach it and this system should be revised to match it rather than continue from scratch.

## CAVEATS — please read
See the end of this turn's message for open questions and a concrete ask.
