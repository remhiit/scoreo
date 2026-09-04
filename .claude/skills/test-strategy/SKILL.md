---
name: test-strategy
description: Turn a spec's acceptance criteria into a leveled test strategy — which scenarios to write, at which layer (unit/integration/component/e2e), and which are mandatory vs recommended vs out of proportion. Not yet invoked by any routine (wiring it into implement-task/pr-review/site-quality is future work, out of scope of this file — see doc/technical/automation-plan.md §6); use it interactively, or as a step inside another skill's own procedure, whenever a spec's acceptance criteria need to be translated into concrete test scenarios before or during implementation.
---

# Test Strategy

## Objectif

Converts a spec's acceptance criteria — plus the surrounding code context and,
when one exists, an implementation plan — into a concrete, leveled list of
test scenarios: which layer each belongs to (unit, integration, component/UI,
end-to-end), whether it's a nominal/error/edge/regression/invariant case, which
acceptance criterion it verifies, and whether it's mandatory, recommended, or
out of proportion for the change at hand. It never writes the tests
themselves — that's `implement-task`'s "Tests first" step (or a human's, run
interactively) — and it never designs visual-regression scenarios, which
belong to `doc/technical/visual-testing.md`'s own suite. See
`project-conventions` for the repo's layering rules this skill routes
scenarios against.

## Entrées requises

- The spec's `## Critères d'acceptation` (testable statements) and, when
  present, its `## Comportements d'erreur et cas limites` and `## Stratégie de
  tests` seed (the `issue-to-spec` format) — this skill produces the detailed
  version of what that seed only sketches.
- The `## Fichiers impactés` list, or equivalent knowledge of which
  reducer/use case/model/port/adapter/screen the change touches.
- Code context: the existing tests and structure for the touched area(s) —
  `doc/reference.md`'s tables are the fastest way to find what already exists
  and how similar screens are tested today.
- An implementation plan, when one exists (e.g. `implement-task`'s step 3
  plan) — not required to run this skill, but sharpens which scenarios are
  actually reachable by the planned change.

## Préconditions

Not GitHub-triggered on its own — invoked either interactively or from inside
another skill's own procedure, never by a label event. It therefore has
neither a "which issue/PR" rule nor a "claim the run" step
(`doc/automation/skill-contract.md` §1.4): both apply only to label-triggered
routines, and this skill is neither.

Before producing anything, check that the input actually supports it:

- **No testable acceptance criterion in the spec** — stop. Say so plainly
  (which criteria are missing or untestable) and refuse to produce an
  invented strategy. A guessed test plan is worse than none: it gives
  `implement-task` false confidence that coverage was considered.
- **Purely visual or documentation-only change** — "aucun test unitaire
  pertinent" is a valid, complete output here, as long as it states why
  (nothing in the change is exercised by Vitest/jsdom or Playwright's
  behaviour suite). Do not manufacture decorative tests just to have
  something to list.
- **A scenario is actually a visual-regression concern** (layout, spacing,
  dark-mode tokens, anything pixel-level) — do not design it here. Point to
  `doc/technical/visual-testing.md` instead of duplicating its suite.

## Procédure

### 1. Map acceptance criteria to layers

The repo runs three suites (`doc/technical/visual-testing.md` § "The repo has
three test suites" — this skill only ever reaches into the first two):

| Layer | Where | Runner |
|---|---|---|
| Unit | `ui/*/​*Reducer.test.ts`, `application/*.test.ts`, `domain/**/*.test.ts` | Vitest (jsdom, no DOM needed) |
| Component/UI | `ui/*/​*.test.tsx` (React Testing Library) | Vitest + jsdom |
| Integration | Use case exercised against a real port adapter (e.g. `infrastructure/localStorage/*.test.ts`), or a reducer/component test that exercises more than one collaborator together | Vitest (jsdom) |
| End-to-end | `apps/scoreo/e2e/*.spec.ts` | Playwright + Chromium |

For each acceptance criterion, ask: what is the *smallest* layer that can
falsify it?

- Pure state transition (an action → a new state, no side effect) → **unit**,
  reducer test.
- Business rule with zero framework dependency (score computation, ELO,
  validation) → **unit**, use case or domain test.
- A reducer/use case driving a real port adapter (persistence round-trip,
  migration applied on load) → **integration**.
- Behavior only observable through rendered markup (a button appears/
  disappears, a modal opens, a class toggles) → **component/UI**.
- A flow that only exists once several screens/persistence steps compose
  (create → play → finish → check Stats) → **end-to-end**, and only when the
  criterion genuinely can't be falsified one layer down — e2e is the most
  expensive suite here, reserve it for what nothing smaller can catch
  (`doc/reference.md`'s existing `e2e/*.spec.ts` list is the precedent to
  match, not a lower bar to clear).

Never assign a criterion to a heavier layer than needed "for confidence" —
that's what "hors de proportion" (§3) is for.

### 2. Classify each scenario

For every criterion mapped above, and for every error/edge case in the spec's
`## Comportements d'erreur et cas limites`, write one scenario as:

```
[<Layer>] <one-line behavior being verified> — couvre <critère(s) d'acceptation>
Type: nominal | erreur | limite | régression | invariant
```

- **Nominal** — the nominal/golden path the criterion describes.
- **Erreur** — an explicitly documented error behavior (invalid input,
  rejected state transition).
- **Limite** — a boundary the spec calls out (empty state, first/last item,
  a count at its cap).
- **Régression** — reproduces a bug this change fixes, or protects a
  behavior a nearby refactor could silently break even though no acceptance
  criterion states it directly (name which one).
- **Invariant** — a business rule that must hold regardless of the specific
  change (e.g. "scores never go negative", "a match always has ≥2 players")
  — flag these even when the spec doesn't phrase them as an acceptance
  criterion, since they're exactly what a change nearby is most likely to
  break unnoticed.

A scenario with no acceptance criterion and no named invariant/regression
reason to justify it does not belong in the strategy — cut it rather than
padding the list.

### 3. Separate mandatory from recommended from out of proportion

Three buckets, always all three (even when a bucket is empty — say so
explicitly rather than omitting it):

- **Obligatoires** — every nominal-path scenario for a stated acceptance
  criterion, plus every documented error/edge case. `implement-task`'s "Tests
  first" step writes these before touching implementation code; a PR missing
  one is incomplete.
- **Recommandés** — invariants and regressions worth covering but not
  strictly required by a stated criterion (e.g. an edge case that's plausible
  but not named in the spec, a second assertion strengthening an already-
  covered path). Useful, not blocking.
- **Hors de proportion** — scenarios that would only be justified by a much
  larger surface than this change actually touches: an e2e test for something
  a unit test already falsifies, exhaustive input-matrix coverage for a
  single-branch conditional, a new test suite for a one-line copy change.
  Name what was considered and why it's excluded — this bucket is what stops
  a future run from re-proposing the same over-engineered coverage.

### 4. Assemble the output

```markdown
## Stratégie de tests — <issue/PR référencée>

### Obligatoires
- [Unitaire] <scénario> — <critère(s)> — nominal
- [Composant] <scénario> — <critère(s)> — erreur
...

### Recommandés
- [Intégration] <scénario> — <critère(s) ou invariant nommé> — invariant
...

### Hors de proportion (à ne pas écrire)
- <scénario envisagé> — <pourquoi il dépasse le périmètre>
...

### Tests visuels
<« Aucun » si non pertinent, ou un renvoi vers doc/technical/visual-testing.md
précisant si le module/écran touché a déjà un spec `*.visual.spec.ts` — jamais
un scénario visuel détaillé ici.>
```

If step "Préconditions" triggered a refusal (no testable criterion), the
output is that refusal instead of this template — never a partial strategy
that quietly drops the missing criteria.

## Sorties obligatoires

- The structured strategy in the format above (§4), or an explicit refusal
  naming exactly what's missing (§ Préconditions) — one or the other, always
  one of the two, never silence.
- Every scenario in "Obligatoires"/"Recommandés" traces to a stated
  acceptance criterion or a named invariant/regression reason (§2's rule).
- The "Hors de proportion" bucket is present even when empty, so a reader
  knows it was considered rather than skipped.
- The "Tests visuels" line is present, either "Aucun" (justified) or a
  pointer to `doc/technical/visual-testing.md` — never a duplicated visual
  scenario.

## Contrôles

Before returning the strategy: every acceptance criterion in the input has at
least one scenario or an explicit reason it needs none (e.g. already covered
by an existing test named explicitly); every scenario names its layer, its
type (§2), and its bucket (§3); no scenario invents a visual-regression case
instead of pointing to `doc/technical/visual-testing.md`. A strategy that
fails any of these checks is not ready to hand back to the caller.

## Escalade

Per `doc/automation/skill-contract.md` §3, specialized to this skill's one
possible stop condition (ambiguous/incomplete input): a spec with no testable
acceptance criterion. Since this skill has no GitHub trigger of its own, it
never poses `automation:needs-human` itself — it states the refusal (§
Préconditions) and returns control to whatever invoked it (a human, or the
calling skill's own escalation path) rather than guessing a strategy to keep
going.

## Limites

- Never writes the tests themselves — only the strategy that names them.
  `implement-task` (or a human) is what actually creates `*.test.ts(x)` files.
- Never invents scenarios to fill a bucket when the spec doesn't support
  them — an empty "Recommandés" or "Hors de proportion" section is a valid,
  honest output.
- Never designs visual-regression scenarios — always redirects to
  `doc/technical/visual-testing.md` instead of duplicating that suite's
  responsibility.
- Never decides the spec's risk category or readiness verdict — that's
  `issue-to-spec`'s call, made before this skill would even run.
- Never poses or removes a GitHub label — it has no claim step because it
  has no trigger of its own (§ Préconditions).
