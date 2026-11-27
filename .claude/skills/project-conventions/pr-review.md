# Scoreo overlay — `pr-review`

This file is Scoreo's overlay for the shared skill `dev-workflow:pr-review`
(plugin `dev-workflow` from the `remhiit/workflows` marketplace). The shared
skill reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where the
two disagree, **this file wins**. It holds only what is specific to Scoreo:
its paths and commands, and its automation pipeline (labels, routines R2–R5,
the coordinator and its sub-agents, traceability). Everything generic lives in
the shared skill, so an improvement made there reaches Scoreo unless this
file overrides that point.

Section titles keep the names they had when this skill lived in
`.claude/skills/pr-review/SKILL.md`, so a reference such as
`pr-review/SKILL.md` § "X" elsewhere in the repo now means § "X" of this file.
Step numbers ("step 6") refer to the shared skill's procedure, which keeps the
same numbering.

Step mapping for this skill: the original § 1 "Run the checklist" is the shared
§ 1 "La grille"; § 2 "Classify every finding" is shared §§ 2–3; § 3 "Guard
against a moved HEAD" is shared § 4; §§ 4–5 "Post the review" / "Label the
verdict" are shared § 5.

## Entrées requises

The PR under review, and the issue it links via `Closes #N` — the spec this
checklist reviews the diff against. As R3, also the routine's own journal
comment on the PR if one already exists (`<!-- automation-log:pr-review -->`,
written by `review-status-sync.yml`), read in "Skip a duplicate review"
below to detect an already-reviewed commit.

As one of the coordinator's two review sub-agents (#469/#470), the
coordinator's own prompt is the *only* input in context — no separate
GitHub trigger event, no journal to check, and never the other reviewer's
prompt, reply, or findings. See "Context isolation (coordinator sub-agent
only)" below before reading anything else — it now has one variant per
corpus (functional/technical), each stating exactly what that prompt is
allowed to contain.

## Préconditions

### Which PR

- **As R3** (fired by the routine's GitHub trigger): the PR is the one from
  your triggering context — the `pull_request` event that started this run.
  Don't search for it (e.g. by scanning for `automation:needs-review`); the
  trigger context already identifies it precisely, including when several
  PRs carry `automation:needs-review` at once (each matching event starts
  its own independent session, one PR each).
- **Interactive** (asked directly in a session): review the PR the user
  named. Ask for the number if it wasn't given.
- **As one of the coordinator's review sub-agents** (#469/#470): the PR
  number, the exact HEAD SHA to review, and which corpus this run is
  (`functional` or `technical`) are given directly in this sub-agent's own
  launch prompt — nothing to search for, nothing to infer from a GitHub
  trigger event (there isn't one; this session was launched by the
  coordinator's own `Agent` call). Run only the checklist items §1 "Run the
  checklist" below assigns to that corpus — never the other corpus's items,
  and never both.

### Context isolation (coordinator sub-agent only)

The whole reason the coordinator launches **two fresh** sub-agents for this
step, never reusing the one that just finished implementing and never
letting the two read each other, is that review has to be independent both
of the implementer's own account of its work and of the other reviewer's
verdict (#470 — the split is only worth doing because the two corpora are
disjoint; two reviewers reading the same inputs would just be one reviewer
twice). That only holds if each session's context stays limited to exactly
what its own corpus allows — never the other corpus's extra input, never
the other reviewer's reply. There are two variants below; run exactly one,
per the corpus named in the launch prompt.

#### Functional corpus

> Since the move to the shared `dev-workflow:pr-review` skill, every run
> reads `project-conventions/SKILL.md` and this file to learn its procedure;
> that is allowed for both corpora. What the functional corpus must not do is
> use `project-conventions` § architecture/compatibilite or
> `doc/technical/architecture.md` as evidence for a finding.

This run's context is exactly: the issue's spec, the diff, and
`doc/functional/`. Nothing else.

- Fetch the issue's spec yourself (`issue_read`) — never accept a
  paraphrase of it from the prompt beyond the number.
- Read the diff yourself (`pull_request_read`) — never the PR description's
  own narrative (its "Résumé"/plan/"Questions non résolues" text) as
  evidence for or against a finding; that text is the implementer's own
  account of its work, exactly what this isolation exists to keep out.
  It's fine to note the PR *exists* and *what it claims to close* — the
  restriction is on treating the implementer's own reasoning as evidence.
- Never open `doc/technical/architecture.md` or consult `project-conventions`
  for this run — that's the technical reviewer's corpus, not this one's. A
  finding that genuinely needs them isn't yours to make (see "Out-of-corpus
  findings" below).
- Ground every finding in the diff itself and `doc/functional/` — checklist
  item 1 ("Spec conformance") and the functional half of item 4 ("Doc
  freshness": is `doc/functional/feature.md` or `doc/functional/features/*.md`
  stale relative to the diff's user-facing behavior) are this corpus's own.

#### Technical corpus

This run's context is exactly: the diff, `doc/technical/architecture.md`,
and `project-conventions`. **Never** the issue's spec — this corpus judges
architecture and convention compliance, not spec conformance, and reading
the spec anyway would blur the two reviewers back into one.

- Read the diff yourself (`pull_request_read`) — same restriction on the PR
  description's own narrative as the functional corpus above.
- Never call `issue_read` or otherwise fetch the linked issue for this run —
  not even to "understand context"; a finding that turns out to be about
  spec conformance isn't yours to make (see "Out-of-corpus findings" below).
- Ground every finding in the diff itself, `doc/technical/architecture.md`,
  and `project-conventions` — checklist items 2 ("Hexagonal architecture"),
  3 ("Backward-compat of serialized models"), 5 ("Debt introduced"), and the
  technical half of item 4 ("Doc freshness": is `doc/reference.md` or
  `doc/technical/*.md` stale relative to the diff's reducers/use
  cases/models/ports/adapters) are this corpus's own.

#### Both corpora

- Never read any issue/PR comment posted during this same coordinator run —
  in particular, never look for or read a `coordinator-implement` journal
  entry (`<!-- automation-log:coordinator-implement -->`) even if one exists
  on this PR. That comment is exactly "the implementer's GitHub journal"
  #469 names as the backdoor this isolation has to close, not an exception
  to it. The same goes for the other reviewer's own journal marker
  (`coordinator-review-functional`/`coordinator-review-technical`,
  `scripts/automation-log.mjs`) and for the other reviewer's own PR review —
  never read it, even if it was already submitted when this run starts.

##### Out-of-corpus findings

A finding can surface that doesn't belong to this run's corpus — the
technical reviewer noticing the diff doesn't satisfy an acceptance
criterion, or the functional reviewer noticing a reducer calling a
repository directly. Don't discard it and don't silently downgrade it: tag
it `corpus: out` (in the structured findings reply, § "Classify every
finding" below) instead of `corpus: in`, with a one-line note on why it
falls outside this run's own corpus. `coordinator/SKILL.md`'s arbitration rule
(`scripts/review-verdict.mjs`) excludes it from the mechanical verdict —
"formed on the wrong inputs" is exactly the case #470 documents for this —
but it's still recorded, never dropped.

This section has no equivalent for standalone R3: a human/R5-opened PR
carries no separate "implementer sub-agent" to be isolated from, and no
second reviewer to be isolated from either — nothing here changes how R3
already reads a PR normally, running the full checklist below in one pass.

### Claim the run (R3 only, first action)

Before reading anything else: remove `automation:needs-review` and add
`automation:in-progress`. Do this immediately, before the checklist below —
not after. The routine's GitHub trigger fires on *any* `pull_request` action
while `automation:needs-review` is present (a Routine allows one GitHub
trigger, not a multi-select of actions, so `automation:needs-review` acts as
the queue flag instead of picking specific event types). If
`automation:needs-review` is still there when this step posts *any* label,
that label-add is itself a qualifying event and re-triggers R3 on the same
PR — clearing it first closes that door before it can reopen. Skip this step
for an ad hoc interactive review the user asked for directly (no labels to
manage there), **and as either of the coordinator's review sub-agents**
(#469/#470) — that label was never posted on a coordinator-owned PR in the
first place (the coordinator never posts `automation:needs-review` on a PR
it owns, `coordinator/SKILL.md` § Limites), so there's nothing to claim
here.

At this same moment, note the PR's current HEAD SHA (`pull_request_read`) —
as the coordinator's sub-agent, this is simply the SHA given in the launch
prompt. The checklist below reads the diff at this SHA — the guard just
before "Post the review" needs it to detect a HEAD that moved mid-review,
and the dedup check right below needs it to recognize a commit already
reviewed.

### Skip a duplicate review (R3 only, right after claiming)

`.automation/routines.yml` declares `deduplicate_by: head_sha` for this
routine — this step is what actually enforces it (the dispatcher itself is
observability-only, `doc/workflows/automation-plan.md` §4 "Dispatcher déclaratif"). Two
`labeled(automation:needs-review)` deliveries for the same commit are
possible even with "claim the run" in place (e.g. a duplicate webhook
delivery, or `requeue-lost-events.mjs` re-posing the label on a run that was
actually still in flight) — the class of double-fire behind incidents #94
and #99 (`doc/workflows/state-machine.md` §5).

**As either of the coordinator's review sub-agents** (#469/#470): skip this
step too — the `pr-review` journal only exists once the coordinator posts a
real `automation:review-pass` verdict (§ "Label the verdict" below), which
never happens mid-loop; there's no journal to dedupe against, and the
coordinator itself, not either sub-agent, is what bounds how many review
rounds a PR gets (three, same cap as `address-feedback`'s).

Read the PR's comments (`pull_request_read` `get_comments`) and find the one
whose body starts with `<!-- automation-log:pr-review -->` — the journal
`review-status-sync.yml` upserts after every verdict. If it exists, read its
`Commit analysé` and `Statut` fields:

- If `Commit analysé` equals the HEAD SHA just noted **and** `Statut` is not
  `running`, this exact commit was already reviewed by a prior run. Don't
  repeat the checklist or post a second review. Re-post the matching label
  (`succeeded` → `automation:review-pass`, `failed` → `automation:needs-fix`),
  remove `automation:in-progress`, and stop.
- Otherwise (no log comment, a different SHA, or `Statut: running` — another
  session's review is genuinely in flight right now) proceed with the
  checklist below as normal. A different SHA means a new commit landed since
  the last review, which is exactly the case that must get a fresh pass.

`review-status-sync.yml` is the only writer of this journal (§ out of
scope below) — a session running this skill never writes or edits it
itself, only reads it.

## Traçabilité

Per `doc/workflows/skill-contract.md` § "Traçabilité" (#494): this skill's
own instance of the structured output (the formal PR review, § "Post the
review" below) carries the model that actually ran it, `<id>` (e.g.
`claude-sonnet-5`, never the marketing name).

- **As R3** (this skill running as its own Claude Code Remote session): call
  `get_session` (no `session_id`) and use `session_context.model` — include
  a `Traçabilité : skill \`pr-review\`, modèle \`<id>\`` line in the
  submitted review's synthesis body (§ "Post the review" step 3).
  Normalize that value the way `skill-contract.md` § "Traçabilité" states it:
  strip a context-window suffix (`claude-opus-5[1m]` → `claude-opus-5`), and
  prefer `external_metadata.last_served_model` when it is present and differs
  from `session_context.model` — a turn-scoped fallback changes what served
  the run without changing what the session is set to, and that call can come
  back with no usable `session_context.model` at all.
- **As either of the coordinator's review sub-agents** (#469/#470):
  `get_session` doesn't apply — read the model self-reported in this
  sub-agent's own system prompt (the #423 mechanism), and report it back to
  the coordinator alongside this run's findings (§ "Label the verdict"
  below), tagged with this run's own corpus (`functional`/`technical`) —
  that's what lets the coordinator's journal attribute each reviewer's model
  distinctly to its own corpus, rather than one merged value for "the
  reviewer".

If neither source is available, `<id>` is `inconnu` — never guessed — with
the reason stated alongside it.


## Out of scope — don't re-check these

`ci.yml` already runs `lint`, `test`, `build`, `doc-links` on every push. Redoing
that by eye wastes the review on things a machine already verified with
certainty. If CI is red, that's a blocker on its own — no need to also
narrate it here.


## Procédure — Scoreo specifics

### 1. Run the checklist (Scoreo checklist with corpus tags)

As R3 or interactively, run all six items. As one of the coordinator's two
review sub-agents (#470), each item names the corpus it belongs to — run
only the items tagged with your own corpus (§ "Context isolation" above);
an item tagged for the other corpus isn't yours to judge on this run (a
finding formed on it anyway is out-of-corpus, see that same section).

1. **Spec conformance** _(functional)_. Open the linked issue (`Closes #N`).
   Does the diff satisfy every acceptance criterion? Is anything in the PR
   outside the issue's stated scope (scope creep, even well-intentioned) —
   should be called out.
2. **Hexagonal architecture respected** _(technical)_.
   - Reducers (`ui/*/`) stay pure — no repository calls, no use-case
     construction inside a reducer.
   - Use cases (`application/`) have zero framework dependency (no React
     imports, no DOM/localStorage access directly — that belongs behind a
     port).
   - New repository access goes through a `domain/port/` interface with the
     implementation in `infrastructure/`, not a direct call from application
     code.
3. **Backward-compat of serialized models** _(technical)_. For any change to
   `Player`/`GameType`/`Match`/`PlayerScore`: does every new field have a
   zod `.default()` in the matching `*.schema.ts`? Is every removed/renamed
   field documented in `doc/technical/migrations.md`? A missing default or
   an undocumented removal is a blocker, not a nit.
4. **Doc freshness** _(split — functional and technical each own a half)_.
   Cross-check the PR's file changes against `doc/`: new reducer/use
   case/model/port/adapter/screen → matching `doc/reference.md` row and
   functional doc updated. The functional corpus checks
   `doc/functional/feature.md`/`doc/functional/features/*.md` against the
   diff's user-facing behavior; the technical corpus checks
   `doc/reference.md`/`doc/technical/*.md` against the diff's
   reducers/use cases/models/ports/adapters. If the code changed and the
   doc didn't, say which file is now stale.
5. **Debt introduced** _(technical)_. New `TODO`s, disabled tests, silenced
   type errors, copy-pasted logic that should have been a shared helper, a
   shortcut that only works for the happy path from the issue's examples.
   Flag it even if it's not blocking — that's the point of a subjective
   review.
6. **Mockup conformance** _(functional)_. When the spec's `## Maquette`
   section names a mockup (`doc/workflows/design-workflow.md`), compare the
   delivered screens with the mockup's `screens.tsx` as it stands on the
   default branch: a gap the PR does not explain is a finding. So is a
   sketch shipped from `apps/catalog/src/mockups/*/sketches/` instead of
   being promoted into `packages/design-system/` with its test and catalog
   story, or a mockup folder the PR leaves behind. A spec with no
   `## Maquette` section predates the rule: nothing to check. A PR that
   changes what a player sees on an issue whose `## Maquette` says « Sans
   objet » is worth a finding if the exemption no longer holds.


### 2. Classify every finding — Scoreo additions

As one of the coordinator's two review sub-agents (#470), a sixth part is
mandatory: **corpus**, `in` for a finding formed on this run's own
checklist items, `out` for one that isn't (§ "Out-of-corpus findings"
above). This is what `scripts/review-verdict.mjs` reads to exclude an
out-of-corpus finding from the mechanical verdict while still keeping it in
the journal. Standalone R3/interactive runs never set this field — every
finding they report is `in` by construction, running the full checklist.

A finding whose only issue is something lint/prettier/typecheck would
already catch isn't in scope — see "Out of scope" above; don't turn a
stylistic nit CI already enforces into a finding. If the checklist turns up
nothing, publish the review anyway with an explicit pass verdict (see
"Post the review" below) — this template only applies to findings that
exist, it's not a mandatory minimum count.

The overall verdict follows directly from the findings, not a separate
judgment call:

- **`automation:review-pass`** — no `blocking` or `important` finding.
  `suggestion`/`uncertain` findings don't hold up merge on their own (issue
  #379 — "ne pas déclencher R4 sur de simples suggestions"); still surface
  them in the review so a human can act on them later if they choose to.
- **`automation:needs-fix`** — at least one `blocking` or `important`
  finding.


### 3. Guard against a moved HEAD (R3 only, just before posting the review)

Before posting anything, re-read the PR's current HEAD SHA
(`pull_request_read`) and compare it to the SHA noted in "Claim the run".
If it differs, **do not post a review or a verdict label** — post
`automation:needs-review` back on its own, in its own call, and stop there.

Why this matters: `review-status-sync.yml` stamps the `claude/review`
commit status onto `github.event.pull_request.head.sha` at the moment its
`labeled` event fires. A push landing between the start of this review
(which read the diff at the old HEAD) and the verdict label would get the
verdict's status stamped onto a commit this review never actually read.
`needs-review-label.yml`'s `synchronize` handler mostly closes this window
by re-queuing on every push, but webhook delivery order isn't guaranteed —
so this check stays load-bearing even though the race is rare. Don't drop
it as a "simplification" later.

**As either of the coordinator's review sub-agents** (#469/#470): the same
re-check applies, but posting `automation:needs-review` here is exactly
what this mode must never do — that label is standalone R3's own live
GitHub trigger, and posting it on a PR the coordinator owns would start an
independent, uncoordinated second `pr-review` session on the same branch
(`coordinator/SKILL.md` § Limites). If the HEAD SHA differs from the one
noted in "Claim the run", **do not post anything** — no label, no review —
and report back to the coordinator that the HEAD moved before this
sub-agent could finish, naming the old and new SHA, then stop. The
coordinator, not this sub-agent, decides what happens next: per
`coordinator/SKILL.md` § 2, a moved HEAD discards **both** reviewers'
rounds, not just the one that noticed — a verdict computed from one
reviewer's read of the old HEAD and the other's read of the new one would
be comparing two different diffs, so the coordinator relaunches fresh
functional and technical sub-agents together, on the PR's new current HEAD
SHA.

### 4. Post the review (R3 only)

One formal PR review is this commit's single synthesis — the dedup guard
above is what keeps that to one per SHA, this step is just how it's shaped.
Reserve inline comments for findings tied to a specific file/line that are
actionable there and then; anything broader (spec conformance as a whole, a
doc page that should have been updated, a pattern spanning several files)
goes only in the review's summary body, not scattered as inline noise.

1. `pull_request_review_write` `method: create`, no `event` — opens a
   pending review at the noted HEAD SHA (`commitID`).
2. For each localized, actionable finding, `add_comment_to_pending_review`
   with the `path`/`line` it applies to, body starting with its severity
   (e.g. `**blocking**: ...`) followed by evidence, impact, confidence, and
   the recommendation — the same six-part shape as the shared skill's § 2 « Classer chaque constat » and the
   example finding above, not a trimmed-down version of it.
3. `pull_request_review_write` `method: submit_pending`, `event: COMMENT` —
   **never** `APPROVE` or `REQUEST_CHANGES` (no auto-approval mechanism,
   `doc/workflows/automation-plan.md` §3). The submit `body` is the synthesis: every
   finding (inline ones too, so the review reads standalone) grouped by
   severity, plus the overall verdict line from the shared skill's § 3 « Verdict ».

Skip this step for an ad hoc interactive review the user asked for
directly — just report the findings and verdict in the conversation.

**As either of the coordinator's review sub-agents** (#469/#470): this step
still applies — submit the real formal review the same way, independently
of the other reviewer's own submission (never combined into one review,
never referencing the other's findings). Each is its own durable GitHub
artifact, both a human and `address-feedback`'s fix sub-agent (if a fix
round is needed) read from; only step 5 below changes for this mode.

### 5. Label the verdict (R3 only)

No tool available to a Claude Code session here can post a raw commit
status, so the verdict surfaces as a label instead — a separate,
deterministic GitHub Action (`.github/workflows/review-status-sync.yml`)
translates it into the `claude/review` commit status. This step only
applies when running as the automated R3 step; skip it for an ad hoc
interactive review the user asked for directly, **and skip it as either of
the coordinator's review sub-agents** (#469/#470) — report this run's own
findings back to the coordinator in this sub-agent's final reply instead of
posting any label: each finding with its severity, evidence, impact,
confidence, recommendation, and `corpus: in`/`out` (§ "Classify every
finding" above) — structured enough for the coordinator to feed straight
into `scripts/review-verdict.mjs`, never a prose summary the coordinator
would have to re-interpret. Alongside the findings, also report this run's
own self-reported model (§ "Traçabilité" above) and which corpus it ran as
— the coordinator uses this to attribute the model of each reviewer to its
own corpus when it journals or synthesizes this round. The coordinator alone decides label writes for
a PR it owns, and only after combining **both** reviewers' findings through
that mechanical rule: it never applies `automation:needs-fix` itself (that
label is `address-feedback`'s own live GitHub trigger, and posting it here
would start an independent, uncoordinated second `address-feedback` session
racing this run on the same branch — `coordinator/SKILL.md` § Limites), and
it only ever applies `automation:review-pass` once a round finds nothing
left to fix.

`automation:needs-review` is already gone (removed in "Claim the run"
above) — this step's job is to remove `automation:in-progress` and post the
terminal label, right after the review from "Post the review" above is
submitted:

- **`automation:review-pass`** → removing `automation:in-progress`,
  `automation:needs-fix`, and any
  `automation:attempt-1`/`automation:attempt-2`/`automation:attempt-3` if
  present. Clearing the attempt counter matters: it's what
  `address-feedback` (R4) uses to cap retries on a *recurring* failure —
  leaving a stale `automation:attempt-N` from an already-resolved cycle
  would make R4 misread a brand-new `automation:needs-fix` (e.g. from a
  later rebase) as a continuation of the old one, and escalate to
  `automation:needs-human` after fewer genuine attempts than the cap
  intends.
- **`automation:needs-fix`** → removing `automation:in-progress` and
  `automation:review-pass` if present. The submitted review already lists
  every `blocking`/`important` finding with its recommendation — that's
  what `address-feedback` acts on, nothing further to post here.

Apply exactly one of `automation:review-pass`/`automation:needs-fix`, never
both. Re-adding `automation:needs-review` later (e.g. after a fix is
pushed) queues another pass — that's the mechanism R4 uses to request
re-review.

## Sorties obligatoires

Once a run reaches a terminal outcome (not the dedup-skip or moved-HEAD
guards, which stop earlier by design):

- One formal PR review (Procédure §4) — this skill's instance of
  `doc/workflows/skill-contract.md` §2's structured output, its submitted
  body carrying every finding grouped by severity plus the verdict line
  (Statut/Résumé), each inline comment its own Artefact, the checklist
  itself the Validations record, and a Traçabilité line (§ "Traçabilité"
  above).
- Exactly one verdict label, `automation:review-pass` or
  `automation:needs-fix` (Procédure §5), never both.
- `automation:in-progress` removed (Procédure §5).

As either of the coordinator's review sub-agents (#469/#470): the formal PR
review (first bullet) still applies, submitted independently by each; the
last two don't — no label is posted by either sub-agent (Procédure §5), each
reports its own findings (with `corpus: in`/`out`) and its own self-reported
model (§ "Traçabilité" above) back to the coordinator instead, which alone
computes the combined verdict via `scripts/review-verdict.mjs`.

## Contrôles

The checklist itself (Procédure §1–§2) is this skill's validation surface —
every finding classified with severity/evidence/impact/confidence/
recommendation before the verdict is derived (Procédure §2, "The overall
verdict follows directly from the findings"). `ci.yml`'s own
lint/test/build/doc-links runs are explicitly out of scope (see "Out of
scope" above) — this skill never re-runs or re-judges those.

## Escalade

Sans objet — this skill always reaches a terminal verdict
(`automation:review-pass` or `automation:needs-fix`) once the checklist
runs; it never stops to ask a human. A finding that can't be resolved from
the diff alone becomes an `uncertain` finding in the review (Procédure §2),
not a stop condition. The two points where a run *does* stop early — "Skip
a duplicate review" and "Guard against a moved HEAD" — are deduplication/
race guards that re-pose the queue label for another pass, not escalations
to `automation:needs-human` (`doc/workflows/skill-contract.md` §3).

## Limites

- Never re-checks what `ci.yml` already verifies mechanically — lint, test,
  build, doc-links (see "Out of scope").
- Never posts `APPROVE` or `REQUEST_CHANGES` — only `COMMENT` (Procédure
  §4) — there is no auto-approval mechanism.
- Never reviews a PR other than the one named by its trigger context or by
  the user (see "Which PR").
- Never writes or edits the `pr-review` automation-log journal comment —
  only `review-status-sync.yml` does (see "Skip a duplicate review").
- As either of the coordinator's review sub-agents (#469/#470): never reads
  anything beyond what the coordinator's own launch prompt supplied for its
  own corpus — never the other corpus's extra input (the spec, for the
  technical reviewer; `doc/technical/architecture.md`/`project-conventions`,
  for the functional one), never the other reviewer's reply or PR review,
  never the PR description's own narrative, never a comment from the same
  run, never any journal (see "Context isolation (coordinator sub-agent
  only)"); never posts a verdict label itself (see step 5), and never posts
  `automation:needs-review` either, including on a moved HEAD (see § 3) —
  report back to the coordinator and stop instead.
- As either of the coordinator's review sub-agents: never drops a finding
  that falls outside its own corpus — tag it `corpus: out` instead (see
  "Out-of-corpus findings") so it stays in the journal without entering the
  mechanical verdict.
