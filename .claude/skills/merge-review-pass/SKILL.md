---
name: merge-review-pass
description: Merges open remhiit/scoreo pull requests that passed review (label `automation:review-pass`), one at a time in oldest-created-first order, rebasing each onto main and waiting for CI + `claude/review` before merging. Use when asked to merge review-pass PRs, run a merge pass, or after a wave of Dependabot/site-quality (R5) PRs is waiting. Fills a gap in the pipeline documented in doc/technical/automation-plan.md: these PRs never carry the `automation:enabled` label, so the native auto-merge (auto-merge-sync.yml) never picks them up on its own.
---

# Merge Review Pass

## Objectif

Merges, one at a time, the PRs that passed automated review (R3,
`pr-review`) but that nothing else merges on its own. `automation-plan.md`
§4 hands merging to `auto-merge-sync.yml`, a zero-LLM Action that only acts
on PRs carrying the `automation:enabled` label — a label only
`implement-task` (R2) poses, and only on its own low-risk PRs. Dependabot
PRs and `site-quality` (R5) PRs never carry it: once review-passed, they
just accumulate. This skill fills that gap by hand, until
`automation:enabled`'s scope is widened enough to cover them natively.

See `project-conventions` for the monorepo's base pnpm commands and layout.

## Entrées requises

- Read access to the repo's open pull requests and their labels (via
  whichever GitHub interface the session has — MCP tools or `gh`).
- A local git clone with push access to the PR branches being merged (they
  belong to the same repo — Dependabot branches and human-authored
  branches alike).
- `scripts/wait_pr.py` (bundled) needs `GITHUB_TOKEN` or `GH_TOKEN` in the
  environment to avoid GitHub's 60-request/hour anonymous rate limit — see
  § Procédure step 5.

## Préconditions

Not GitHub-triggered by a single event: this skill searches for its own
work (every open `automation:review-pass` PR) rather than reacting to one
named PR, so it has neither a "which PR" rule nor a "claim the run" step
(`doc/automation/skill-contract.md` §1.4 — both apply only to
label-triggered routines reacting to one item; this skill discovers a set
itself, and is explicitly "not yet a routine" per its `automation-plan.md`
§6 entry).

Before rebasing anything:

- **Shallow clone** — `git rev-parse --is-shallow-repository`. If `true`,
  run `git fetch --unshallow origin` first. A shallow clone makes the very
  first rebase fail on a false conflict at the oldest commit in history,
  which has nothing to do with the PR at hand and wastes time diagnosing.
- **Label drift** — filter on the exact label `automation:review-pass`. If
  the search returns nothing, don't conclude too fast that there's nothing
  to do: label names have already shifted once in this repo (`review-pass`
  → `automation:review-pass`, `auto` → `automation:enabled`) — check the
  repo's actual label list before reporting "nothing pending".

## Procédure

Process PRs **one at a time, oldest created first**, never as a batch.
Once one PR merges, main has moved — that's why each PR is rebased again
right before its own turn rather than rebasing the whole batch up front.

### 1. Rebase

```
git fetch origin main <pr-branch>
git checkout -B tmp-<number> origin/<pr-branch>
git rebase origin/main
```

A local temporary branch (`tmp-<number>`) avoids stepping on an existing
working branch and is deleted once this PR is done.

### 2. Conflicts — mechanical resolution only

A rebase that's been waiting can conflict with another PR merged in the
meantime. This skill resolves only what's mechanical — never a functional
call:

- **`package.json`** (root, `apps/scoreo/`, or any `packages/*/`) — the
  conflict is almost always a dependency version already bumped by another
  PR merged in between. Keep the higher of the two versions, clean up the
  `<<<<<<<`/`=======`/`>>>>>>>` markers.
- **`pnpm-lock.yaml`** — never hand-edit it: a hand-edited lockfile
  silently drifts from what's actually installed. `git checkout --ours
  pnpm-lock.yaml`, then `pnpm install --lockfile-only` to regenerate it
  cleanly, then `git add pnpm-lock.yaml`.
- **Anything else** (application code, reducer logic, a test) — not this
  skill's call to make. `git rebase --abort`, leave this PR aside
  unmerged, note why in the final summary, and move to the next one. A
  merge skill that starts arbitrating code loses the property that makes
  it safe to run unsupervised.

Once conflicting files are resolved (or there were none): `git rebase
--continue` until the rebase finishes.

### 3. Validate the lockfile

`pnpm install --frozen-lockfile` — never plain `pnpm install`, which can
silently rewrite the lockfile if resolution drifted. A `--frozen-lockfile`
failure right after a rebase almost always means a `pnpm-lock.yaml`
conflict was resolved wrong in the previous step; fix that before moving
on.

A bump touching build or test tooling (`vite`, `vitest`, `typescript`,
`eslint`, a heavyweight `@types/*`) also deserves `pnpm lint && pnpm
typecheck` before pushing — a major bump (e.g. vitest 4→5) is worth a full
local `pnpm test && pnpm build` before pushing, exactly like `site-quality`
already does when it opens this kind of PR.

### 4. Push

`git push --force-with-lease origin tmp-<number>:<pr-branch>` — never a
plain force, which would silently overwrite a commit pushed by someone (or
something) else in the meantime.

### 5. Wait for CI and review

The push triggers `needs-review-label.yml`, which sends the PR back
through R3 on the new SHA. Wait until every check-run is green **and** the
`claude/review` status is `success` before merging — never merge on a PR
looking green in the UI alone, which can lag a check still in flight.

Don't poll the API in a tight loop. Use this skill's bundled
`scripts/wait_pr.py`, launched in the background:

```
python3 <skill-path>/scripts/wait_pr.py <sha> 90
```

It exits 0 (everything green), 1 (a check genuinely failed), 2 (CI green
but `claude/review` not yet `success`), or 3 (timeout at 45 min). Launch it
in the background and resume once the notification arrives rather than
polling it yourself.

The script authenticates automatically when `GITHUB_TOKEN` or `GH_TOKEN` is
present in the environment — without it, the anonymous quota (60
requests/hour) can be exhausted by a single wait when several PRs are
chained in the same pass, each relaunching the script.

### 6. If CI fails — not this skill's job to fix

Exit code 1 (or a review that comes back `needs-fix`) means a check
genuinely failed, not just that it's still running. In that case, **don't
diagnose or fix anything** — that's not this step of the pipeline. Leave
the PR open, unmerged — it already carries (or will regain, via
`needs-review-label.yml`) the label that routes it back through R3/R4, and
`address-feedback` (R4) is the skill whose job it is to fix it. Note in the
final summary why this PR was set aside, with the check that failed, then
move to the next PR — a CI failure on one PR has no reason to block
unrelated ones.

Real example from this repo: a `@playwright/test` bump PR failed the
`visual` job, which deliberately pins the expected Docker image version and
rejects a mismatch — a real guard, not a flake. That PR stayed open, a
separate PR fixed the pin, and the bump was retried (and merged)
afterward. That's exactly the expected behavior: notice, don't force, move
on.

### 7. Dependabot races

Dependabot can push a new commit to its own branch while this skill is
mid-rebase, or right after a push — for instance if a newer package
version is released in between. Symptoms: a `--force-with-lease` rejected
("stale info"), or check-runs showing `cancelled` on the SHA just pushed.
This isn't an error to work around: re-`git fetch` the branch, rebuild
`tmp-<number>` from the new remote head, redo the rebase from scratch for
this PR, and resume the sequence at step 1.

### 8. Merge

Right before merging, re-read the PR's current state (head SHA, labels,
`mergeable_state`) instead of trusting what was known a few minutes ago —
another push may have landed in between (Dependabot,
`needs-review-label.yml`, or a human). Merge with squash, with a commit
title of `<PR title> (#<number>)`.

A transient error at merge time (502, a network timeout) doesn't
necessarily mean the merge failed server-side — GitHub may have processed
the request before the response came back. Before retrying, re-read the
PR's actual state (`merged: true/false`): GitHub itself won't double-merge
a PR, but retrying on a false assumption of failure wastes time and can
muddy what actually happened.

### 9. Clean up

Delete the local temporary branch (`git branch -D tmp-<number>`), return to
the working branch before moving to the next PR.

## Repeat

Resume at step 1 for the next PR in creation order, until the list of open
`automation:review-pass` PRs is exhausted.

## Sorties obligatoires

- Every `automation:review-pass` PR open at the start of the run is either
  merged, or explicitly left aside with a stated reason (a functional
  rebase conflict, a genuine CI failure, an unresolved Dependabot race) —
  never silently skipped.
- A final summary, always in French per `CLAUDE.md`'s "Toujours répondre en
  français dans le chat" — a table: PR number, subject, rebase outcome (up
  to date / no conflict / conflict resolved / abandoned), CI outcome, and
  final status (merged, or left aside with the precise reason).
- Every temporary local branch (`tmp-<number>`) created during the run is
  deleted before the run ends, whether that PR was merged or left aside.

## Contrôles

Before merging any PR: `pnpm install --frozen-lockfile` passed after the
rebase (§3); for a build/test-tooling bump, `pnpm lint && pnpm typecheck`
(and, for a major bump, `pnpm test && pnpm build`) came back clean; every
check-run on the final SHA is green and `claude/review` is `success`
(`scripts/wait_pr.py` exit 0); the PR's state was re-read fresh immediately
before the merge call (§8). A PR that fails any of these checks is not
merged — it's left aside per §6/§7, never forced through.

## Escalade

Per `doc/automation/skill-contract.md` §3. This skill never poses
`automation:needs-human` itself — it has no claim step (§ Préconditions)
and a CI failure or functional conflict already has its own owner
(`address-feedback`/R4, §6). It stops and reports, rather than guessing,
when:

- **A rebase conflict falls outside package.json/pnpm-lock.yaml** (§2) —
  abort, leave the PR aside, note it in the summary; this is not a
  judgment call this skill is allowed to make.
- **A Dependabot race (§7) doesn't converge after a couple of retries** —
  don't loop indefinitely on the same PR; leave it aside and note the
  repeated race in the summary so a human can look at why the branch keeps
  moving.
- **A merge-time transient error (§8) recurs after a re-verified retry** —
  don't keep retrying blindly; report the PR's actual state and stop
  rather than risk a double action.

## Limites

- Never resolves a rebase conflict outside a dependency version bump or the
  lockfile (§2) — any functional conflict is left for a human or a future
  rebase, never guessed at.
- Never diagnoses or fixes a CI failure (§6) — that's `address-feedback`
  (R4)'s job, not this skill's.
- Never merges more than one PR at a time, and never rebases the whole
  batch up front — each PR is rebased right before its own turn
  (`automation-plan.md` §2 principle 6, "one run, one item").
- Never force-pushes without `--lease` — a plain force could silently
  discard a commit pushed by Dependabot or a human in between.
- Never poses or removes a GitHub label itself beyond what pushing
  naturally triggers (`needs-review-label.yml`'s automatic
  `automation:needs-review`) — it has no claim step of its own (§
  Préconditions).
