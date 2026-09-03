---
name: issue-to-spec
description: Turn a feature/fix description into a well-formed GitHub issue for the Scoreo repo — testable acceptance criteria, impacted files, out-of-scope, a risk category that later determines eligibility for the "automation:enabled" label, and a mandatory readiness verdict (READY_FOR_IMPLEMENTATION/NEEDS_CLARIFICATION/BLOCKED_BY_DEPENDENCY). Use when the user describes a feature or correctif and says to plan/turn it into a ticket ("Plan", "crée une issue", "crée un ticket"). This is the R1 grooming step in doc/technical/automation-plan.md — always run interactively, never as an autonomous routine.
---

# Issue → Spec

## Objectif

Converts a feature/fix description into one GitHub issue with a spec tight
enough that `implement-task` can execute it without coming back to ask
clarifying questions. This skill only produces the spec — it never
implements it: `implement-task` (R2) takes over once the issue reaches
`READY_FOR_IMPLEMENTATION`. See `project-conventions` for repo
layering/backward-compat rules referenced below.

## Entrées requises

The user's direct description of a feature or fix, given interactively.
There is no triggering issue or PR — this skill starts from conversation
context, not a GitHub event.

## Préconditions

Always run interactively, never as an autonomous routine (see frontmatter
description above). This skill has no GitHub trigger, so it has neither a
"which issue/PR" rule nor a "claim the run" step
(`doc/automation/skill-contract.md` §1.4) — both apply only to
label-triggered routines.

## Sizing

One issue = one PR-sized unit of work (`automation-plan.md`'s "un run = un
ticket" principle). If the description covers more than one independent
change, split it into multiple issues rather than writing one spec that spans
several unrelated files.

## Procédure

### Spec format

Write the issue body as:

```markdown
## Contexte

<Objectif utilisateur : pour qui, pourquoi ce changement, en 1-3 phrases.>

## Périmètre

<Ce que cette issue couvre explicitement — le pendant positif de « Hors
scope » ci-dessous. Une phrase suffit si les critères d'acceptation rendent
déjà le périmètre évident, mais la section doit exister : ne jamais laisser
le lecteur déduire le périmètre par soustraction.>

## Critères d'acceptation

- [ ] <Testable, concrete statement — phrase it so a reviewer can check it
      against a test, not against a feeling. "Le bouton archive affiche une
      modale de confirmation" not "améliorer l'UX d'archivage".>
- [ ] ...

## Comportements d'erreur et cas limites

- <Ce qui se passe sur une entrée invalide, un état vide, une limite
  atteinte, etc. — un par cas limite identifié. S'il n'y en a réellement
  aucun (ex. changement purement visuel), écris-le explicitement : « Aucun
  cas limite identifié » plutôt que d'omettre la section.>

## Stratégie de tests

<La surface de test minimale que implement-task doit écrire en premier (cf.
son étape 3 « Tests first ») : quelle couche (reducer/use case/composant),
quel comportement chaque test doit vérifier. Pas les tests eux-mêmes — juste
de quoi les écrire sans deviner.>

## Fichiers impactés

- `apps/scoreo/src/ui/<screen>/<screen>Reducer.ts` (+ test)
- ... (be specific: reducer/use case/model/port/adapter/screen files, per
  doc/reference.md's tables)

## Hors scope

- <What this issue deliberately does not cover, so implement-task doesn't
  scope-creep.>

## Risques et questions ouvertes

- <Risques au-delà de la catégorie ci-dessous : migration de données,
  dépendance externe fragile, ambiguïté de design non tranchée. Une question
  ouverte encore présente ici bloque le verdict à `NEEDS_CLARIFICATION` —
  résous-la avec l'utilisateur avant de créer l'issue plutôt que de la
  documenter sans réponse. S'il n'y en a aucun : « Aucun risque ni question
  ouverte identifié ».>

## Catégorie de risque

**Faible** | **Élevé** — <justification>

## Verdict de readiness

`READY_FOR_IMPLEMENTATION` | `NEEDS_CLARIFICATION` | `BLOCKED_BY_DEPENDENCY`
— voir « Determining the readiness verdict » ci-dessous pour la définition
de chacun et ce que ce verdict change au flow de labels.
```

#### Section « Dépendances » (optionnelle)

Quand cette issue ne peut pas être implémentée avant qu'une autre soit
fermée, ajoute une section `## Dépendances` juste après `## Hors scope` (ou
`## Risques et questions ouvertes` si `Hors scope` est absent) — dans ce
cas, le verdict de readiness est `BLOCKED_BY_DEPENDENCY` tant que le
bloqueur cité reste ouvert (voir « Determining the readiness verdict »
ci-dessous) :

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

### Determining the risk category

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

### Determining the readiness verdict

Before creating the issue, compute one verdict from the spec draft and state
it to the user as part of your summary — this is the structured output
`doc/automation/skill-contract.md` §2's "Statut" field calls for, this
skill's instance of it: no PR/comment to post since R1 is interactive, but
the verdict must still be said out loud, not just implied by what you do
next. No implementation runs without a `READY_FOR_IMPLEMENTATION` verdict
— **preparing** that gate is this skill's job; **enforcing** it inside R2 is
`implement-task`'s job (a later ticket), not done here.

- **`READY_FOR_IMPLEMENTATION`** — every section above is filled in with
  something concrete (not a placeholder), every acceptance criterion is
  testable, every identified edge case and open question has an answer, and
  any `## Dépendances` blocker cited is already closed. Proceed to
  **Labels** below.
- **`NEEDS_CLARIFICATION`** — the spec is missing something only the user
  can supply: an untestable acceptance criterion, an unanswered question in
  `## Risques et questions ouvertes`, an error/edge-case behavior you can't
  infer from the codebase, an unclear risk category. **Don't create the
  issue yet.** List, as a checklist, exactly what's missing and the precise
  question to ask for each item, then ask the user directly — this is the
  interactive path of `doc/automation/skill-contract.md` §3: a human is
  present, so ask rather than guess. Re-run this verdict once they answer.
- **`BLOCKED_BY_DEPENDENCY`** — the spec itself is otherwise complete, but
  `## Dépendances` cites at least one blocker issue still open. Say which
  issue(s) block it. Create the issue as normal, but in **Labels** step 3
  pose `blocked` instead of `automation:queued` (state-machine.md's `blocked`
  row: "Set by R1, alongside a `## Dépendances` section") — `.github/
  workflows/unblock-issues.yml` removes `blocked` and poses
  `automation:queued` itself once every native blocker closes (state-machine.md
  row #10). Never pose `automation:queued` on an issue you know is still
  blocked; the dispatcher has no way to tell a premature `automation:queued`
  from a legitimate one.

### Labels

Once the spec is written, the verdict is `READY_FOR_IMPLEMENTATION` or
`BLOCKED_BY_DEPENDENCY` (never `NEEDS_CLARIFICATION` — that verdict means no
issue exists yet), and the user has confirmed it (this is the interactive
grooming gate — don't skip it):

1. Create the issue with `mcp__github__issue_write` (title = a short
   imperative summary, not the full spec).
2. Add the priority label (`P0`…`P3` — P0 most urgent; ask the user if not
   obvious from context) in its **own** `issue_write` call.
3. **In a separate call**, add the queue label: `automation:queued` when the
   verdict is `READY_FOR_IMPLEMENTATION`, `blocked` when it's
   `BLOCKED_BY_DEPENDENCY` (see "Determining the readiness verdict" above) —
   never `automation:ready` directly. Posing several `automation:ready` at
   once would fire that many R2 events simultaneously; past the run cap
   (5/day on Pro), the excess events are lost (`automation-plan.md` §3). The
   dispatcher (`scripts/dispatch-ready.mjs`, zero LLM, same workflow as the
   hourly sweeper) promotes one `automation:queued` issue to
   `automation:ready` at a time, only once nothing is already
   `automation:ready`/`automation:in-progress` — this bounds the event rate
   into R2 by construction. Pose the queue label alone, in its own call,
   last, for the same reason `automation:ready` used to be: GitHub fires one
   `labeled` webhook per label added, and a routine's trigger filter matches
   on the issue's *current* label state, not which label the event named
   (issue #99). The rule "never `automation:ready` with another label in the
   same call" still holds — it's now the dispatcher's responsibility, not
   R1's.

## Sorties obligatoires

- One GitHub issue created via `mcp__github__issue_write`, body in the spec
  format above.
- The priority label (`P0`…`P3`), added in its own call.
- The queue label (`automation:queued` or `blocked`), added last, in its own
  call, never combined with another label.
- The readiness verdict stated out loud to the user, per "Determining the
  readiness verdict" above — this skill's instance of `doc/automation/
  skill-contract.md` §2's "Statut" field.
- `automation:enabled` is never added here (see Limites).

## Contrôles

Before creating the issue: every acceptance criterion is testable, every
section of the spec format holds something concrete (no placeholder), the
risk category is justified per "Determining the risk category", the
readiness verdict is computed per "Determining the readiness verdict", and
— for `READY_FOR_IMPLEMENTATION`/`BLOCKED_BY_DEPENDENCY` — the user has
confirmed the spec (the interactive grooming gate in "Labels" above). A
`NEEDS_CLARIFICATION` verdict means these controls failed and the issue must
not be created yet.

## Escalade

Per `doc/automation/skill-contract.md` §3, specialized to this skill's only
possible stop condition (ambiguous/incomplete input): a `NEEDS_CLARIFICATION`
verdict. Since this skill is interactive, escalating means asking the user
directly rather than guessing — see "Determining the readiness verdict"
above — never creating an issue with unresolved questions "documented" but
unanswered.

## Limites

- Never creates the issue while the verdict is `NEEDS_CLARIFICATION`.
- Never poses `automation:ready` directly — only `automation:queued` or
  `blocked` (the dispatcher promotes to `automation:ready`).
- Never poses `automation:enabled` — that's `implement-task`'s call to make
  once the actual diff exists, not a prediction made before any code is
  written.
- Never batches more than one independent change into a single issue (see
  "Sizing").
