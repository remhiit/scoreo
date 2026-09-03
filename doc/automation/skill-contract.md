# Skill contract

The formal contract every `SKILL.md` in `.claude/skills/` must satisfy: the
template a skill file is written against, the structured output format a
routine (R2/R3/R4) reports through, a conformity checklist, and the single
canonical statement of when a skill must stop and escalate to
`automation:needs-human`.

This document defines the contract only — it does not migrate any existing
skill to it. `automation-plan.md` §2 principle 5 ("tout le savoir-faire vit
dans les skills") is why a shared shape matters: eight files
(`project-conventions`, `issue-to-spec`, `implement-task`, `pr-review`,
`address-feedback`, `site-quality`, `weekly-report`, `new-scoring-module`)
already carry this responsibility, each having grown its own way of stating
"what counts as done" and "when to give up." Applying this template to the
three interactive skills is tracked by #426 (risk Faible), and to the five
routine skills — `implement-task`, `pr-review`, `address-feedback`,
`site-quality`, `weekly-report`, whose content is the literal prompt of an
autonomous routine — by #427 (risk Élevé), split by risk profile so their
merge policies can differ. No `SKILL.md` is touched by this document.

`doc/automation/state-machine.md` stays the formal contract for *labels and
transitions* (which label a routine claims, which it poses, in what order).
This document is the formal contract for *skill file shape and reporting* —
the two are complementary: state-machine.md tells a routine what to do with
labels, this document tells it what its `SKILL.md` must declare and how to
report what happened.

## 1. Common `SKILL.md` template

A conformant `SKILL.md` declares each of the following, as a distinct
section (heading text is free — a skill may already have a differently
named heading that covers the same ground; conformity is about content
being present and locatable, not about matching a heading string verbatim).

1. **Frontmatter** — `name` and `description`. The description states which
   routine (R1…R6), if any, invokes this skill, matching the mapping in
   `automation-plan.md` §6 and `doc/automation/state-machine.md` §3.
2. **Objectif** — one paragraph: what this skill accomplishes and, briefly,
   what it deliberately does not (the boundary with adjacent skills, e.g.
   `address-feedback` fixes flagged scope, it doesn't re-review).
3. **Entrées requises** — what the skill assumes is already in its context
   when it starts: the triggering issue/PR (as R2/R3/R4 — see "Which
   issue"/"Which PR" below), or the user's direct ask (interactive). Any
   file or artifact the procedure depends on existing before step 1 (a
   spec's acceptance criteria, an open review thread, a prior run's label
   state).
4. **Préconditions** — the guard checks a skill runs *before* doing real
   work, so that a stale or already-handled trigger doesn't get acted on
   twice. In practice this is two things, both already present under
   varying headings in every routine skill today:
   - **Which issue/PR** — as a routine, act only on the item named by the
     triggering event, never search for or substitute a different one, even
     when several matching items exist simultaneously (`implement-task`
     § Which issue, `pr-review`/`address-feedback` § Which PR).
   - **Claim the run** — for a label-triggered routine, remove the trigger
     label and add `automation:in-progress` as the *first* action, before
     any other label write (`doc/automation/state-machine.md` §5 "Claim the
     run, always first"). A skill with no GitHub trigger (interactive-only,
     like `issue-to-spec`) has no claim step.
5. **Procédure** — the ordered steps. No fixed shape beyond "ordered and
   followable without re-deriving intent" — this is the section that
   varies most between skills.
6. **Sorties obligatoires** — what must exist on disk/in the repo/on GitHub
   once the skill finishes a successful run: a commit, a PR, a doc update,
   a label transition, a comment. State it as a checklist a caller could
   verify mechanically (e.g. `implement-task`: one commit, a PR with
   `Closes #N`, `doc/` updated per `CLAUDE.md`'s pre-commit checklist).
   Reported through the structured format in §2 below when the skill is a
   routine (R2/R3/R4).
7. **Contrôles** — the validations that must pass *before* the skill is
   allowed to declare success. For code-touching skills this is
   `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm
   test:e2e` (`project-conventions`) plus a visual check for any UI screen
   touched; for a doc-only or grooming skill it's whatever that skill's own
   acceptance bar is (e.g. `issue-to-spec`: every acceptance criterion is
   testable, risk category stated). A skill that has no way to verify its
   own output before reporting success is not conformant.
8. **Escalade** — the skill's own stop conditions, stated as a pointer to
   §3 below rather than re-derived locally. A skill may add conditions
   specific to its own judgment calls (e.g. `address-feedback`'s
   contradictory-feedback check), but the base set is defined once, in one
   place, precisely so no skill has to restate or reinvent it.
9. **Limites** — explicit guardrails on what this skill must *not* do:
   scope it must not expand into, actions reserved for a human or a
   different component (e.g. `implement-task` never merges its own PR;
   `address-feedback` never "while I'm here" refactors adjacent code; no
   skill batches more than one ticket/PR per run — `automation-plan.md` §2
   principle 6).

## 2. Common structured output format (R2/R3/R4)

A routine's user-visible report — a PR description, a review verdict
comment, a fix synthesis comment — carries the same five fields, in this
order, regardless of which routine produces it. This formalizes a pattern
already in independent use (`pr-review`'s per-finding severity
(`blocking`/`important`/`suggestion`/`uncertain`) + overall
`automation:review-pass`/`automation:needs-fix` verdict, `address-feedback`'s
`✅ Corrigé` / `⏭️ Non appliqué` / `⚠️ Arbitrage requis` synthesis, and the
`routine`/`status`/`iteration`/`validation`/`resultUrl`/`summary` fields
`scripts/automation-log.mjs` already renders into its idempotent journal
comment) rather than inventing a new shape:

| Field | Content | Existing precedent |
|---|---|---|
| **Statut** | One of a small closed set the routine defines (e.g. `implement-task`: PR opened / escalated; `pr-review`: `automation:review-pass` / `automation:needs-fix`; `address-feedback`: clean / partial / escalated) | `automation-log.mjs`'s `status` (`running`/`succeeded`/`failed`/`manual-required`) |
| **Résumé** | One or two sentences: what changed and why, not a restatement of the diff | Every routine's commit/PR description |
| **Artefacts** | Links to what this run produced: commit(s), PR, doc files touched | `automation-log.mjs`'s `resultUrl` (link to the run) |
| **Validations** | Which checks were run and their result — not "tests pass" without saying which suite | `pr-review`'s out-of-scope note (CI already covers lint/test/build/doc-links) + its own per-finding severities; `automation-log.mjs`'s `validation` field |
| **Questions non résolues** | What this run could not resolve and why, scoped precisely enough that a human (or the next run) doesn't have to reconstruct it from the diff and label history | `address-feedback`'s `⚠️ Arbitrage requis` section |

A skill's "Sorties obligatoires" section (§1.6) should say which of a PR
description, a verdict comment, or a synthesis comment is this skill's
instance of this format — not literally render this table into every
GitHub comment. `scripts/automation-log.mjs`'s journal remains the
machine-generated summary derived from these fields (today wired for R3's
verdict only, per `automation-plan.md` § Journal d'exécution idempotent);
this format is what a skill's own free-text output should already contain
so that wiring a journal call for R2/R4/R5 later is a mechanical extraction,
not a rewrite of what the routine reports.

## 3. Conditions de passage à `automation:needs-human`

Stated once, here, referenced by every skill's "Escalade" section (§1.8)
rather than re-derived. The exact label mechanics per entity (which labels
are removed/added, in what order) are `doc/automation/state-machine.md`'s
job — rows #6, #19, #20, and §5–§7 there; this section is the shorter,
skill-facing summary of *when*, independent of entity:

A skill run — routine or interactive — escalates instead of proceeding
when any of these hold:

1. **Ambiguous or incomplete input.** The spec, review, or request is
   missing what the skill needs to act without guessing scope (e.g. an
   issue with no acceptance criteria — `state-machine.md` § Incomplete
   issue).
2. **Contradictory feedback.** Two inputs ask for mutually exclusive
   changes, and picking one side would silently discard the other
   (`state-machine.md` § Contradictory feedback).
3. **Scope mismatch discovered mid-work.** The fix/change turns out to
   require a materially larger or different change than what was asked —
   treated the same as exhausting a retry cap, not as license to expand
   scope unilaterally.
4. **Retry cap exhausted.** A recurring failure (e.g. R3 ↔ R4) has not
   converged after the number of genuine attempts the state machine allows
   (currently 3 — `state-machine.md` §5).
5. **Validation cannot be made to pass.** The skill's own "Contrôles"
   (§1.7) stay red after a good-faith fix attempt, and pushing/committing
   anyway would leave a broken result for the next step to inherit.

As a routine (no human watching the session live), escalating means: post a
comment naming precisely what's blocking (using the "Questions non
résolues" field of §2), then swap whatever claim label this run holds for
`automation:needs-human` — never leave an item silently parked on
`automation:in-progress` with no comment and nothing watching it. As an
interactive skill (a human present), escalating means asking the question
directly instead of guessing.

`automation:needs-human` is terminal: no automated component ever removes
it (`state-machine.md` §6) — only a human, by clearing it and re-applying
whatever control label restarts the pipeline.

## 4. Conformity checklist

Mechanical — answerable without interpretation, by reading the `SKILL.md`
file against §1–§3 above. Usable on an existing skill or a new one.

- [ ] Frontmatter names the routine(s), if any, that invoke this skill.
- [ ] A stated objective names both what the skill does and its boundary
      with adjacent skills.
- [ ] Entrées requises are stated: what must already be in context before
      step 1.
- [ ] If GitHub-triggered: a "which issue/PR" rule is stated, forbidding
      substitution of a different item when the named one isn't actionable.
- [ ] If GitHub-triggered: a "claim the run" step is stated, and it runs
      before any other label write.
- [ ] Sorties obligatoires are stated as a checklist a caller could verify
      without re-reading the whole procedure.
- [ ] Contrôles are stated: the validations required before declaring
      success, specific enough to name commands or checks, not just "make
      sure it works."
- [ ] Escalade points to §3 of this document (or restates it verbatim)
      rather than defining its own independent stop conditions.
- [ ] Limites name at least one thing this skill must not do, drawn from
      what's actually tempting to over-reach on for this skill (scope
      creep, batching, merging its own output).
- [ ] A routine skill's user-visible output (PR description, verdict,
      synthesis) carries the five fields of §2, even if not labeled with
      those exact names.

A skill that fails any line above is not yet conformant — the line names
exactly what to add, without further interpretation.

## 5. Worked example — `implement-task` (R2), unmodified

Illustrating §1–§4 against the existing `.claude/skills/implement-task/
SKILL.md` (read, not edited, by this ticket):

| Template section | Where it already lives in `implement-task/SKILL.md` | Gap, if any |
|---|---|---|
| Frontmatter | `description` names "This is the R2 step in doc/technical/automation-plan.md" | Conformant |
| Objectif | Opening paragraph: "Executes a single GitHub issue's spec... as one branch, one commit, one PR" | Conformant |
| Entrées requises | Implicit — "the spec" (the issue body written by `issue-to-spec`) — never stated as its own section | Gap: no explicit "assumes the issue already carries acceptance criteria, impacted files, risk category" statement |
| Préconditions | § Which issue (item selection) + step 1's "claim" via `automation:ready`→`automation:in-progress` swap | Conformant, under a different heading name |
| Procédure | § Workflow, steps 1–11 | Conformant |
| Sorties obligatoires | Scattered across steps 8–9 (one commit, PR with `Closes #N`) and step 7 (doc updates) | Gap: no single checklist a caller could check against without reading the whole workflow |
| Contrôles | Step 5, explicit command list | Conformant |
| Escalade | Step 1's ask/stop rule, phrased independently rather than pointing at a shared contract | Gap: restates escalation logic instead of referencing §3 of this document — expected, since this document didn't exist yet when it was written |
| Limites | § Guardrails | Conformant |

This is exactly the shape #427 will act on for the five routine skills: most
sections already exist under working names, and the gaps are additive
(state an assumption, add a checklist, add a pointer) rather than
structural rewrites — consistent with `automation-plan.md`'s "un run = un
ticket" applying just as much to a low-risk documentation change as to a
code change.
