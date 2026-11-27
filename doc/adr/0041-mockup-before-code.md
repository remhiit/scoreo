---
title: A mockup before the code
decision: A feature that changes what a player sees is first mocked up in the design catalog from real design-system components and validated by the merge of its mockup PR; until then its spec stays NEEDS_CLARIFICATION.
status: Accepted
date: 2026-11-07
sources: commit 3a55370, PR #635; commit 8f34e0a, PR #672 (Écrans page as the lasting trace)
---

## Context

Rémi wanted mockups of the design system to base changes on, and a systematic mockup step before
coding features that touch the UI, living in the repository as a live catalog — so what is validated
is what can be built, and every design-system change a feature needs is named and drafted before the
first line of the feature.

## Decision

- **Required** when a feature adds or changes, for a player: a screen or a region of one; a
  design-system component or prop; the layout of an existing screen; a visible state (empty, error,
  loading, finished, a new dialog or sheet). **Not required** for a wording change, a bug fix
  restoring what was already validated, pure logic with no visible change, documentation, tooling;
  in doubt, the spec's `## Maquette` section says why.
- **Mock up**: `apps/catalog/src/mockups/<feature>/` (`index.tsx` default-exporting a `Mockup`,
  `screens.tsx` composing the design system with realistic data — today next to proposed for an
  existing screen — and `sketches/` drafting what the design system lacks, the only place a mockup
  writes classes and CSS, prefixed `mk-`, semantic tokens only). PR titled `Maquette : <feature>`,
  with a published preview.
- **Validate**: the mockup is validated when its PR is merged.
- **Build**: promote each sketch into the design system (component, CSS, test, catalog story), never
  ship a sketch; compare the delivered screen with the mockup and state deliberate differences; the
  PR removes the mockup folder and adds the shown states to the screen's entry on the catalog's
  **Écrans** page, the lasting trace of every shipped screen.
- **Review**: an unexplained gap with the merged mockup, or a sketch left outside the design system,
  is a finding.

## Consequences

- `apps/catalog/src/catalog.test.tsx` guards mockups (composition only, no inline style or icon
  import in sketches, semantic tokens only, every mockup has a rendering screen).
- Full rule: `doc/workflows/design-workflow.md`.
