---
name: issue-to-spec
description: Turn a feature/fix description into a well-formed GitHub issue for the Scoreo repo — testable acceptance criteria, impacted files, out-of-scope, and a risk category that later determines eligibility for the "automation:enabled" label. Use when the user describes a feature or correctif and says to plan/turn it into a ticket ("Plan", "crée une issue", "crée un ticket"). This is the R1 grooming step in doc/technical/automation-plan.md — always run interactively, never as an autonomous routine.
---

# Issue → Spec

Converts a feature/fix description into one GitHub issue with a spec tight
enough that `implement-task` can execute it without coming back to ask
clarifying questions. See `project-conventions` for repo layering/backward-compat
rules referenced below.

## Sizing

One issue = one PR-sized unit of work (`automation-plan.md`'s "un run = un
ticket" principle). If the description covers more than one independent
change, split it into multiple issues rather than writing one spec that spans
several unrelated files.

## Spec format

Write the issue body as:

```markdown
## Contexte

<Why this change, in 1-3 sentences.>

## Critères d'acceptation

- [ ] <Testable, concrete statement — phrase it so a reviewer can check it
      against a test, not against a feeling. "Le bouton archive affiche une
      modale de confirmation" not "améliorer l'UX d'archivage".>
- [ ] ...

## Fichiers impactés

- `apps/scoreo/src/ui/<screen>/<screen>Reducer.ts` (+ test)
- ... (be specific: reducer/use case/model/port/adapter/screen files, per
  doc/reference.md's tables)

## Hors scope

- <What this issue deliberately does not cover, so implement-task doesn't
  scope-creep.>

## Catégorie de risque

**Faible** | **Élevé** — <justification>
```

### Section « Dépendances » (optionnelle)

Quand cette issue ne peut pas être implémentée avant qu'une autre soit
fermée, ajoute une section `## Dépendances` juste après `## Hors scope` (ou
`## Catégorie de risque` si `Hors scope` est absent) :

```markdown
## Dépendances

Dépend de #114 (pose le port dont ce ticket a besoin)
Dépend de #117 (même raison)
```

Une ligne par bloqueur, forme exacte `Dépend de #N (raison)` — c'est le
format que `.github/workflows/sync-issue-dependencies.yml` parse pour poser
le lien natif GitHub `blocked_by` (zéro LLM, cf.
`doc/technical/automation-plan.md` §2.2 et §4). Sans cette section, aucune
automatisation ne sait que l'issue est bloquée.

## Determining the risk category

This is the one field that isn't free-form — it comes straight from the
`automation:enabled` whitelist in `automation-plan.md` §5:

- **Faible** (eligible for `automation:enabled` later, at `implement-task`'s
  discretion): content/copy changes, documentation, dependency bumps, local
  refactors with no public behavior change.
- **Élevé** (never `automation:enabled`, always manual merge): serialized models and their
  migrations (`Player`/`GameType`/`Match`/`PlayerScore`), ports/adapters,
  `apps/scoreo/public/` (manifest, `sw.js`), Vite/TS config, navigation
  (`apps/scoreo/src/ui/navigation/`).

If a single issue's impacted files span both categories, classify it
**Élevé** — the whole issue takes the stricter category, don't split risk
across an issue's files after the fact.

## Labels

Once the spec is written and the user has confirmed it (this is the
interactive grooming gate — don't skip it):

1. Create the issue with `mcp__github__issue_write` (title = a short
   imperative summary, not the full spec).
2. Add the priority label (`P0`…`P3` — P0 most urgent; ask the user if not
   obvious from context) in its **own** `issue_write` call.
3. **In a separate call**, add the `automation:queued` label — not
   `automation:ready` directly. Posing several `automation:ready` at once
   would fire that many R2 events simultaneously; past the run cap (5/day
   on Pro), the excess events are lost (`automation-plan.md` §3). The
   dispatcher (`scripts/dispatch-ready.mjs`, zero LLM, same workflow as the
   hourly sweeper) promotes one `automation:queued` issue to
   `automation:ready` at a time, only once nothing is already
   `automation:ready`/`automation:in-progress` — this bounds the event rate
   into R2 by construction. Pose `automation:queued` alone, in its own
   call, last, for the same reason `automation:ready` used to be: GitHub
   fires one `labeled` webhook per label added, and a routine's trigger
   filter matches on the issue's *current* label state, not which label the
   event named (issue #99). The rule "never `automation:ready` with another
   label in the same call" still holds — it's now the dispatcher's
   responsibility, not R1's.

Do not add `automation:enabled` here — that's `implement-task`'s call to
make once the actual diff exists, not a prediction made before any code is
written.
