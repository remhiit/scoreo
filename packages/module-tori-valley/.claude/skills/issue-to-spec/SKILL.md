---
name: issue-to-spec
description: Turn a feature/fix description into a well-formed GitHub issue for the Torī Valley Scoreboard repo — testable acceptance criteria, impacted files, out-of-scope, and a risk category that later determines eligibility for the "auto" label. Use when the user describes a feature or fix and says to plan/turn it into a ticket ("Plan", "create an issue", "create a ticket"). This is the R1 grooming step in doc/technical/automation-plan.md — always run interactively, never as an autonomous routine.
---

# Issue → Spec

Converts a feature/fix description into one GitHub issue with a spec tight
enough that `implement-task` can execute it without coming back to ask
clarifying questions. See `project-conventions` for the repo layering/backward-compat
rules referenced below.

## Sizing

One issue = one PR-sized unit of work (`automation-plan.md`'s "one run = one
ticket" principle). If the description covers more than one independent
change, split it into multiple issues rather than writing one spec that spans
several unrelated files.

## Spec format

Write the issue body as:

```markdown
## Context

<Why this change, in 1-3 sentences.>

## Acceptance criteria

- [ ] <Testable, concrete statement — phrase it so a reviewer can check it
      against a test, not against a feeling. "The archive button shows a
      confirmation modal" not "improve the archiving UX".>
- [ ] ...

## Impacted files

- `src/ui/<screen>/<screen>Reducer.ts` (+ test)
- ... (be specific: reducer/use case/model/port/adapter/screen files, per
  doc/reference.md's tables)

## Out of scope

- <What this issue deliberately does not cover, so implement-task doesn't
  scope-creep.>

## Risk category

**Low** | **High** — <justification>
```

## Determining the risk category

This is the one field that isn't free-form — it comes straight from the
`auto` whitelist in `automation-plan.md` §5:

- **Low** (eligible for `auto` later, at `implement-task`'s discretion):
  content/copy changes, documentation, dependency bumps, local refactors with
  no public behavior change.
- **High** (never `auto`, always manual merge): serialized models and their
  migrations (`Player`, `Match`/`PlayerResult`), ports/adapters, `public/`
  (manifest, `sw.js`), Vite/TS config, navigation (`src/ui/navigation/`).

If a single issue's impacted files span both categories, classify it
**High** — the whole issue takes the stricter category, don't split risk
across an issue's files after the fact.

## Labels

Once the spec is written and the user has confirmed it (this is the
interactive grooming gate — don't skip it):

1. Create the issue (title = a short imperative summary, not the full spec).
2. Add the priority label (`P0`…`P3` — P0 most urgent; ask the user if not
   obvious from context).
3. Add the `ready` label — this is what would trigger implementation
   (autonomously in a later phase; for now, `implement-task` picks up the
   first open `ready` issue when told to "develop").

Do not add `auto` here — that's `implement-task`'s call to make once the
actual diff exists, not a prediction made before any code is written.
