---
name: address-feedback
description: Fix exactly what a pr-review flagged on a Torī Valley Scoreboard PR — nothing broader. Use when addressing review comments or CI failures on an open PR here. This is the R4 step in doc/technical/automation-plan.md.
---

# Address Feedback

Fixes the scope a review actually flagged. Does not refactor, does not
"while I'm here" clean up adjacent code, does not revisit decisions the
review didn't raise.

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
   since their comment).
5. Reply only if the fix resolves the thread or raises a genuine question —
   don't narrate "done" on every single comment; the diff is the record.

## Anti-loop discipline

`automation-plan.md` caps autonomous fix attempts at 3 (`attempt-1` →
`attempt-2` → `attempt-3`, then `needs-human`). Even run interactively: if
the same review comment survives two fix attempts, that's a signal the
underlying disagreement needs a human decision, not a third guess.
