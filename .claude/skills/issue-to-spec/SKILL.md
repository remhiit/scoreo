---
name: issue-to-spec
description: Turn a feature/fix description into a well-formed GitHub issue for the Scoreo repo — testable acceptance criteria, impacted files, out-of-scope, a risk category that later determines eligibility for the "automation:enabled" label, and a mandatory readiness verdict (READY_FOR_IMPLEMENTATION/NEEDS_CLARIFICATION) that states only whether the spec is complete, independent of dependency state. Use when the user describes a feature or correctif and says to plan/turn it into a ticket ("Plan", "crée une issue", "crée un ticket"). This is the R1 grooming step in doc/technical/automation-plan.md — always run interactively, never as an autonomous routine, on its own. Also invoked, procedure unchanged except for its own coordinator-sub-agent delta, as the coordinator's spec-completion sub-agent (`.claude/skills/coordinator/SKILL.md`, #506) — see the "As the coordinator's sub-agent" notes below for what that mode changes.
---

# Issue → Spec

## Objectif

Converts a feature/fix description into one GitHub issue with a spec tight
enough that `implement-task` can execute it without coming back to ask
clarifying questions. This skill only produces the spec — it never
implements it: `implement-task` (R2) takes over once the issue reaches
`READY_FOR_IMPLEMENTATION`. See `project-conventions` for repo
layering/backward-compat rules referenced below.

### As the coordinator's sub-agent

When launched by `.claude/skills/coordinator/SKILL.md` (#506,
§ "Spec (sous-agent issue-to-spec, optional)") rather than interactively,
this procedure runs unchanged except for these deltas, stated again at the
exact point they replace below:

- **Entrées requises** — the input is the existing issue the coordinator
  named (an issue number in the prompt), never a user's direct description:
  read that issue fresh via GitHub tools, the same "built fresh from
  GitHub, never forwarded from context" rule every coordinator sub-agent
  follows. There is no conversation context to fall back on.
- **Sizing / Labels** — there is no new issue to create and no size to
  judge: this mode only completes the body of that same existing issue, in
  place (`mcp__github__issue_write`, method `update` — never `create`).
  Never poses a priority label (`P0`…`P3`) or a queue label
  (`automation:queued`/`blocked`): the issue already carries the priority
  it was created with, and its queue state is `automation:in-progress`,
  already claimed by the coordinator for this run's entire lifetime — this
  sub-agent never touches either.
- **Determining the readiness verdict** — complete only what the codebase
  and the issue's existing content let you deduce without asking a
  question, the same "never simulate interactivity" rule every coordinator
  sub-agent follows. The interactive path below ("ask the user directly")
  never applies here: no human is present. If, even after deducing
  everything you can, a `## Risques et questions ouvertes` item, an
  untestable acceptance criterion, an inferable-but-not-inferred edge case,
  or an unclear risk category still needs a real human answer, do not guess
  one — leave the issue body untouched and return `NEEDS_CLARIFICATION` to
  the coordinator, with the same checklist of exactly what's missing and
  the precise question for each item this skill would otherwise have put to
  the user.
- **Labels / the interactive grooming gate** — the human confirmation this
  skill normally requires before creating an issue (§ "Labels", § Contrôles)
  doesn't apply here: there is no separate issue to create and no human to
  confirm with. Reaching your own `READY_FOR_IMPLEMENTATION` verdict is
  itself the gate — write the completed spec straight back to the issue
  (`issue_write`, method `update`), keeping the exact section order of
  "Spec format" above (the mandatory trailing `## Traçabilité` included,
  naming this sub-agent's own model), then return that verdict to the
  coordinator. This is the only GitHub write this mode ever makes.
- **Escalade** — there is no user to ask directly: return
  `NEEDS_CLARIFICATION` to the coordinator instead (previous bullet), never
  create or edit anything while that verdict stands. The coordinator
  performs the actual escalation to a human from there
  (`coordinator/SKILL.md` § "Spec (sous-agent issue-to-spec, optional)").
- **Traçabilité** — `get_session` doesn't apply to an in-process sub-agent;
  read the model self-reported in this sub-agent's own system prompt
  instead (#423), the same mechanism every other coordinator sub-agent
  uses, and self-report it back to the coordinator in your final reply (it
  has no other channel to learn it).

Everything else — the spec format itself, the risk-category rule, and the
"one issue = one PR-sized change" principle applied to what's already on
the issue — is unchanged from the interactive procedure below.

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

`READY_FOR_IMPLEMENTATION` | `NEEDS_CLARIFICATION` — voir « Determining the
readiness verdict » ci-dessous pour la définition de chacun. Ce verdict
n'affirme qu'une chose, la complétude de la spec : il ne dit rien de l'état
de blocage par dépendance, porté ailleurs (label `blocked` + lien natif
`blocked_by`, voir la section « Dépendances » ci-dessous).

## Traçabilité

Créée avec le skill `issue-to-spec`, modèle `<id>`.
```

La dernière section, `## Traçabilité`, est obligatoire et toujours en toute
fin de corps — jamais avant `## Verdict de readiness`. `<id>` est
l'identifiant machine du modèle qui exécute cette session (ex.
`claude-sonnet-5` — jamais le nom marketing), obtenu par `get_session` (sans
`session_id`, donc sur cette session elle-même) et son
`session_context.model`, per `doc/automation/skill-contract.md` § « Traçabilité »
— cette skill tourne comme sa propre session Claude Code Remote, jamais
comme un sous-agent du coordinateur. Si `get_session` échoue ou n'est pas
disponible, `<id>` devient `inconnu` et le motif est dit dans la même phrase
(« modèle `inconnu` — get_session indisponible ») plutôt que deviné.

#### Section « Dépendances » (optionnelle)

Quand cette issue ne peut pas être implémentée avant qu'une autre soit
fermée, ajoute une section `## Dépendances` juste après `## Hors scope` (ou
`## Risques et questions ouvertes` si `Hors scope` est absent). Cette
section ne change pas le verdict de readiness — une spec par ailleurs
complète reste `READY_FOR_IMPLEMENTATION` même bloquée (voir « Determining
the readiness verdict » ci-dessous) — elle détermine seulement le label de
file posé en **Labels** ci-dessous (`blocked` tant que le bloqueur cité
reste ouvert, `automation:queued` sinon) :

```markdown
## Dépendances

Dépend de #114 (pose le port dont ce ticket a besoin)
Dépend de #117 (même raison)
```

Une ligne par bloqueur, forme exacte `Dépend de #N (raison)` — c'est le
format que `.github/workflows/sync-issue-dependencies.yml` parse pour
réconcilier le lien natif GitHub `blocked_by` avec cette section (pose ce
qui manque, retire ce qui n'est plus déclaré — zéro LLM, cf.
`doc/technical/automation-plan.md` §2.2 et §4). Sans cette section, aucune
automatisation ne sait que l'issue est bloquée, et aucun lien `blocked_by`
n'est jamais touché — c'est ce qui protège un lien posé à la main.

Cette section fait autorité : le parseur ancre son repérage en début de
ligne (une vraie ligne `## Dépendances`, pas une occurrence ailleurs dans le
corps), donc n'y cite jamais le nom de la section en prose ni dans un
exemple de format (backticks ou bloc de code) en dehors de cette section
elle-même — une telle mention ne détourne plus le parseur, mais reste
trompeuse à la lecture. S'il existe plusieurs titres `## Dépendances` dans
un même corps, seul le premier (de haut en bas) est pris en compte ; ne
jamais en écrire plusieurs.

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

This verdict states one thing only: **is the spec complete and
implementable as written**. It is independent of dependency state — whether
`## Dépendances` cites a blocker, and whether that blocker is still open, is
a separate, dynamic question, answered exclusively by the `blocked` label
and the native `blocked_by` link (see "Labels" below), never by this field.
Unlike this static text, those are actively maintained: `blocked` is cleared
automatically the moment every cited blocker closes
(`.github/workflows/unblock-issues.yml`, state-machine.md row #10). A verdict
value can't update itself the same way, which is exactly why it must not
duplicate that state.

- **`READY_FOR_IMPLEMENTATION`** — every section above is filled in with
  something concrete (not a placeholder), and every acceptance criterion is
  testable, every identified edge case and open question has an answer. This
  holds regardless of `## Dépendances`: a spec that is otherwise complete
  keeps this verdict even while blocked — an open blocker cited there only
  changes which queue label **Labels** below poses (`blocked` instead of
  `automation:queued`), never this verdict. Proceed to **Labels** below.
- **`NEEDS_CLARIFICATION`** — the spec is missing something only the user
  can supply: an untestable acceptance criterion, an unanswered question in
  `## Risques et questions ouvertes`, an error/edge-case behavior you can't
  infer from the codebase, an unclear risk category. **Don't create the
  issue yet.** List, as a checklist, exactly what's missing and the precise
  question to ask for each item, then ask the user directly — this is the
  interactive path of `doc/automation/skill-contract.md` §3: a human is
  present, so ask rather than guess. Re-run this verdict once they answer.
  **As the coordinator's sub-agent** (#506): there is no human to ask —
  leave the issue untouched and return this checklist as
  `NEEDS_CLARIFICATION` to the coordinator instead (§ "As the coordinator's
  sub-agent" above).
  This is the one case where incompleteness and blocking can coexist and
  incompleteness still wins: a spec that is both incomplete and cites an open
  blocker still gets `NEEDS_CLARIFICATION`, never the `blocked`-label
  treatment below — incompleteness is the real obstacle, and it won't
  resolve itself when the blocker closes.

### Labels

Once the spec is written, the verdict is `READY_FOR_IMPLEMENTATION` (never
`NEEDS_CLARIFICATION` — that verdict means no issue exists yet), and the
user has confirmed it (this is the interactive grooming gate — don't skip
it). **As the coordinator's sub-agent** (#506): steps 1–3 below don't
apply — there is no new issue to create and no label to pose; instead,
write the completed spec back onto the existing issue and return the
verdict to the coordinator (§ "As the coordinator's sub-agent" above).

1. Create the issue with `mcp__github__issue_write` (title = a short
   imperative summary, not the full spec).
2. Add the priority label (`P0`…`P3` — P0 most urgent; ask the user if not
   obvious from context) in its **own** `issue_write` call.
3. **In a separate call**, add the queue label. This choice is about
   dependency state, not the verdict (see "Determining the readiness
   verdict" above): `blocked` when `## Dépendances` cites at least one
   blocker issue still open, `automation:queued` otherwise — never
   `automation:ready` directly. Posing several `automation:ready` at
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
   R1's. `unblock-issues.yml` removes `blocked` and poses `automation:queued`
   itself once every native blocker closes (state-machine.md row #10); never
   pose `automation:queued` on an issue you know is still blocked — the
   dispatcher has no way to tell a premature `automation:queued` from a
   legitimate one.

## Sorties obligatoires

- One GitHub issue created via `mcp__github__issue_write`, body in the spec
  format above.
- The priority label (`P0`…`P3`), added in its own call.
- The queue label (`automation:queued` or `blocked`), added last, in its own
  call, never combined with another label.
- The readiness verdict stated out loud to the user, per "Determining the
  readiness verdict" above — this skill's instance of `doc/automation/
  skill-contract.md` §2's "Statut" field.
- A `## Traçabilité` section at the very end of the issue body (see "Spec
  format" above) — this skill's instance of `doc/automation/skill-contract.md`
  §2's "Traçabilité" field.
- `automation:enabled` is never added here (see Limites).

## Contrôles

Before creating the issue: every acceptance criterion is testable, every
section of the spec format holds something concrete (no placeholder), the
risk category is justified per "Determining the risk category", the
readiness verdict is computed per "Determining the readiness verdict", and —
for `READY_FOR_IMPLEMENTATION` — the user has confirmed the spec (the
interactive grooming gate in "Labels" above). A `NEEDS_CLARIFICATION`
verdict means these controls failed and the issue must not be created yet.

## Escalade

Per `doc/automation/skill-contract.md` §3, specialized to this skill's only
possible stop condition (ambiguous/incomplete input): a `NEEDS_CLARIFICATION`
verdict. Since this skill is interactive, escalating means asking the user
directly rather than guessing — see "Determining the readiness verdict"
above — never creating an issue with unresolved questions "documented" but
unanswered.

**As the coordinator's sub-agent** (#506): there is no user to ask —
return `NEEDS_CLARIFICATION` to the coordinator instead, with the same
missing-items checklist this skill would otherwise have put to the user (§
"As the coordinator's sub-agent" above). The coordinator, not this
sub-agent, performs the actual escalation to a human from there.

## Limites

- Never creates the issue while the verdict is `NEEDS_CLARIFICATION`.
- Never poses `automation:ready` directly — only `automation:queued` or
  `blocked` (the dispatcher promotes to `automation:ready`).
- Never poses `automation:enabled` — that's `implement-task`'s call to make
  once the actual diff exists, not a prediction made before any code is
  written.
- Never batches more than one independent change into a single issue (see
  "Sizing").
- As the coordinator's sub-agent (#506): never creates a new issue and
  never poses any label on it (priority, queue, or otherwise) — only edits
  the existing issue's body, or leaves it untouched and returns
  `NEEDS_CLARIFICATION` to the coordinator instead of asking a human.
