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

## Attempt counter (check this first, before reading the review)

`automation-plan.md` caps autonomous fix attempts at 3 per recurring
`needs-fix` cycle — this is the anti-loop guard, and it's the first thing
to check, before touching any code:

1. Look at the PR's current labels for `attempt-1`/`attempt-2`/`attempt-3`.
2. **No attempt label present** → this is attempt 1. Add `attempt-1`, then
   proceed with the workflow below.
3. **`attempt-1` present** → this is attempt 2. Remove `attempt-1`, add
   `attempt-2`, then proceed.
4. **`attempt-2` present** → this is attempt 3, the last one allowed.
   Remove `attempt-2`, add `attempt-3`, then proceed.
5. **`attempt-3` present** → this would be a 4th attempt. **Stop here —
   do not touch the code.** Remove `needs-fix`, remove `auto` if present,
   add `needs-human`, and post a comment summarizing what's still wrong
   and why it wasn't fixed automatically (so the human doesn't have to
   reconstruct the loop from label history). This is exactly the case
   this cap exists for: the same disagreement surviving two fix attempts
   means a human decision is needed, not a third guess.

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
5. Reply only if the fix resolves the thread or raises a genuine question —
   don't narrate "done" on every single comment; the diff is the record.
