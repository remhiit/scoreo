# Design workflow — a mockup before the code

A feature that changes what a player sees is **mocked up and validated before it is coded**. The
mockup is built in the design catalog (`apps/catalog/`, see [`design-catalog.md`](design-catalog.md))
from the real design-system components, so what is validated is what can be built — and every
design-system change the feature needs is named, and drafted, before the first line of the feature.

The skills apply this rule; this page is its single definition, they link here instead of restating it.

## When a mockup is required

Required when the feature adds or changes, for a player:

- a screen, or a region of one (a new panel, a new bar, a new list);
- a design-system component or prop;
- the layout of an existing screen;
- a visible state: empty, error, loading, finished, a new dialog or sheet.

Not required for: a wording change, a bug fix that brings a screen back to what was already
validated, pure logic (a reducer, a use case, a migration) with no visible change, documentation,
tooling. When in doubt, the spec says why no mockup is needed in its `## Maquette` section.

## The steps

1. **Mock up** (`issue-to-spec`). Create `apps/catalog/src/mockups/<feature>/`:
   - `index.tsx` default-exports a `Mockup` (`apps/catalog/src/shell/types.ts`): id (the folder
     name), title, issue number, a one-or-two-sentence summary of what changes for the player, the
     design-system changes it needs, and its screens;
   - `screens.tsx` composes the design system with realistic example data — the states the
     acceptance criteria name (empty, filled, error…). For a change to an existing screen, show
     **today** next to **proposed**;
   - `sketches/` drafts what the design system lacks: a component, in the shape it will take in the
     design system. Only there may a mockup write classes and CSS (prefixed `mk-`, semantic tokens
     only); never inline styles or `lucide-react`. A missing icon is named in `designSystemChanges`
     and shown with a stand-in from the set.

   Open a PR titled `Maquette : <feature>` with it, publish a preview
   (`pnpm --filter @scoreboards/catalog build:preview`, then the `dist/catalog.html` page — e.g. as a
   Claude Artifact, republished at the same URL on each change) and link both from the issue.
2. **Validate** (Rémi). The mockup is validated when its PR is merged. Comments on the PR or the
   preview are addressed on the same PR. Until the merge, the spec stays `NEEDS_CLARIFICATION`.
3. **Specify** (`issue-to-spec`). The issue's `## Maquette` section names the mockup folder, its
   merged PR and preview, and the design-system changes; the acceptance criteria refer to the
   mockup's screens.
4. **Build** (`implement-task`). Read the mockup first. Promote each sketch into the design system
   (component, CSS, test, catalog story); never ship a sketch as is. The visual check compares the
   delivered screen with the mockup; a deliberate difference is stated in the PR. The PR **removes
   the mockup folder**: the feature now exists, and the mockup stays in git history.
5. **Review** (`pr-review`). An unexplained gap between the merged mockup and the delivered screen,
   or a sketch left outside the design system, is a finding.

## Guards

`apps/catalog/src/catalog.test.tsx` (in `pnpm test`): a mockup's screens compose the design system
only (no `className`, no inline style, no `lucide-react`); its sketches write no inline style and
import no icon; a sketch stylesheet reads semantic tokens only (no `var(--ctp-…)`, no raw colour);
every mockup has a screen, its id is its folder name, and every screen renders.
