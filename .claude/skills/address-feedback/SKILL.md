---
name: address-feedback
description: Fix exactly what a pr-review flagged on a Scoreo PR — nothing broader. Use when addressing review comments or CI failures on an open PR here. This is the R4 step in doc/technical/automation-plan.md.
---

# Address Feedback

Fixes the scope a review actually flagged. Does not refactor, does not
"while I'm here" clean up adjacent code, does not revisit decisions the
review didn't raise.

## Which PR

- **As R4** (fired by the routine's GitHub trigger): the PR is the one
  from your triggering context — the `pull_request` `labeled` event
  (label `needs-fix`) that started this run. Don't search for it.
- **Interactive** (asked directly in a session): the PR the user named.

## Claim the run (R4 only, first action)

Before touching any code: read the PR's current labels (note which of
`attempt-1`/`attempt-2`/`attempt-3` is present, if any — this decides the
attempt number, see below), then immediately **remove `needs-fix` and add
`in-progress`**, before anything else, including before posting any
`attempt-N` label.

This order matters and isn't optional. R4's GitHub trigger fires on *any*
`pull_request.labeled` event while `needs-fix` is present. If `needs-fix`
is still there when this step posts `attempt-1`, that post is itself a
`labeled` event that matches the trigger and re-fires R4 — which then
sees `attempt-1`, posts `attempt-2` (still with `needs-fix` present),
re-fires again, and so on. This isn't hypothetical: it happened on PR
#111, where R4 chained through `attempt-1` → `attempt-2` → `attempt-3` →
`needs-human` within about a minute from its own label writes, not from
three genuine fix attempts. Removing `needs-fix` first closes that door
before any later label-add can reopen it.

Skip this step in interactive mode (no labels to manage there), but still
apply the attempt-count decision below.

## Attempt counter

`automation-plan.md` caps autonomous fix attempts at 3 per recurring
`needs-fix` cycle. Using the labels read in "Claim the run" above (before
they were changed):

- **No attempt label was present** → this is attempt 1.
- **`attempt-1` was present** → this is attempt 2.
- **`attempt-2` was present** → this is attempt 3, the last one allowed.
- **`attempt-3` was present** → this would be a 4th attempt. **Stop here —
  do not touch the code.** Remove `in-progress`, remove `auto` if present,
  add `needs-human`, and post a comment summarizing what's still wrong and
  why it wasn't fixed automatically (so the human doesn't have to
  reconstruct the loop from label history). This is exactly the case this
  cap exists for: the same disagreement surviving two fix attempts means a
  human decision is needed, not a third guess.

`pr-review/SKILL.md` clears any `attempt-*` label when it reaches
`review-pass`, so a stale counter from an already-resolved cycle never
carries over into a later, unrelated `needs-fix`.

Even run interactively (no routine involved), apply the same check — an
issue that's already at `attempt-3` shouldn't get a fourth try just
because a human happened to invoke the skill this time.

## Workflow

1. **Read every flagged item** from the review (or failing CI check) before
   touching anything. Build the list of exactly what needs to change.
2. **Fix only that list.** If a fix reveals it can't be done without a
   larger change than the review anticipated, stop and flag that
   explicitly rather than expanding scope unilaterally — this is the one
   case where checking in beats plowing ahead.
3. **Re-run the full check suite** (`pnpm lint && pnpm typecheck && pnpm test
   && pnpm build`) before pushing — a fix for one flagged item shouldn't
   introduce a new failure elsewhere.
4. **Push to the same branch** (new commit, not an amend of history that's
   already been reviewed — the reviewer should be able to see what changed
   since their comment). Pushing triggers `needs-review-label.yml`
   (`synchronize`), which re-queues R3 on its own — nothing else to do
   here to get re-reviewed.
5. **Remove `in-progress` and add the attempt label determined above**
   (`attempt-1`/`attempt-2`/`attempt-3`) — the run's terminal label, posted
   only now that the fix is actually done.
6. Reply only if the fix resolves the thread or raises a genuine question —
   don't narrate "done" on every single comment; the diff is the record.
