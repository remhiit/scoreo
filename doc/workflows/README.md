# Workflows

How work moves through this repository, from an idea to a merged pull request, and the working
rules that go with it. This page is the map; each step links to the document that defines it.
For how to *use* Scoreo, see [`../utilisateur/`](../utilisateur/README.md).

## The chain, end to end

```
idea ──► issue (spec) ──► queue ──► coordinator ──► review ──► merge ──► issue closed
          R1, human      labels     R2 + R3 + R4    verdict    checks green
```

GitHub labels are the event bus: each step reads a label to know it is its turn, and writes the
label that hands over to the next. Deterministic GitHub Actions move labels; Claude Code routines
do the judgement work, each one entirely defined by a skill file in `.claude/skills/`. The full
label table and every transition are in [`state-machine.md`](state-machine.md); the rationale,
phases and incident log in [`automation-plan.md`](automation-plan.md).

### 1. Issue — the spec (R1)

Rémi describes a feature or a fix; an interactive session turns it into a GitHub issue with the
`issue-to-spec` skill: scope, out of scope, testable acceptance criteria, impacted files, a risk
category (Faible / Moyen / Élevé) and a readiness verdict (`READY_FOR_IMPLEMENTATION` or
`NEEDS_CLARIFICATION`). A priority label `P0`…`P3` orders the backlog. This step is never
autonomous.

A change a player will see needs a **validated mockup first**: it is built in the design catalog
from real design-system components and validated by merging its own PR. Without it the spec stays
`NEEDS_CLARIFICATION`. See [`design-workflow.md`](design-workflow.md) and, for the catalog
itself, [`design-catalog.md`](design-catalog.md).

### 2. Queue — dispatch

A ready spec gets `automation:queued`. An issue with an open native dependency waits (`blocked`)
until its blockers close, then is queued automatically. The dispatcher promotes one queued issue
at a time to `automation:ready` (highest priority, then oldest), only when no other run is in
flight and the review backlog is short. An hourly sweeper re-posts lost events and recovers runs
that died. See [`state-machine.md`](state-machine.md) §2–§6.

### 3. Coordinator — implement, review, fix (R2 + R3 + R4)

`automation:ready` starts a coordinator run (`.claude/skills/coordinator/`), which claims the
issue (`automation:in-progress`) and drives it to a reviewed PR in one session:

- **Implementation** — a sub-agent runs `implement-task`: plan, tests first, implementation,
  `pnpm lint`/`typecheck`/`test`/`build`/`test:e2e` green, docs updated, one commit, one PR
  (`Closes #N`) labelled `automation:coordinator-owned`.
- **Review** — two isolated sub-agents run the `pr-review` checklist on disjoint corpora
  (functional and technical); a pure script combines their findings into one verdict.
- **Fix** — when the verdict asks for changes, a sub-agent runs `address-feedback`; at most three
  rounds (`automation:attempt-1…3`), then escalation.

Which model each sub-agent uses is a versioned policy: [`model-routing.md`](model-routing.md).
Every skill follows one contract — template, structured output, escalation conditions:
[`skill-contract.md`](skill-contract.md).

Outside the coordinator, the same steps exist as standalone routines (R2 `implement-task`, R3
`pr-review` on `automation:needs-review`, R4 `address-feedback` on `automation:needs-fix`).

### 4. Review verdict and escalation

A converged run posts `automation:review-pass`, which becomes the `claude/review` commit status.
Anything automation cannot settle — ambiguous spec, red suite, fix cap reached, contradictory
feedback — ends on `automation:needs-human` with a comment saying what blocks; a human removes it
to put the issue back in the queue.

### 5. Merge

`main` is protected: `lint`, `test`, `build`, `doc-links`, `e2e` and `claude/review` must be green.
A PR whose risk stays Faible end to end gets `automation:enabled` and merges itself through native
auto-merge; any other PR is merged by a human (or by a `merge-review-pass` pass). The linked issue
is then closed automatically. CI, the Actions and the deployment to GitHub Pages are described in
[`deployment.md`](deployment.md).

### Around the chain

- **Weekly hygiene (R5)** — `site-quality`: dependencies, dead doc links, Lighthouse, PWA validity,
  one PR per category.
- **Weekly report (R6)** — `weekly-report`: pipeline health and the auto-merge whitelist.

## Working rules

The repository-wide rules (UI only through the design system, hexagonal layering, backward-compatible
serialized models, one issue = one commit = one PR, French commits and PRs) are in the root
[`CLAUDE.md`](../../CLAUDE.md) and the `project-conventions` skill.

## Testing guides

| Document | Content |
|---|---|
| [`visual-testing.md`](visual-testing.md) | The three test suites and the visual regression baselines |
| [`navigation.md`](navigation.md) | The hash router's tests |
| [`testing-google-drive.md`](testing-google-drive.md) | The Google Drive sync tests |

## Index

| Document | Content |
|---|---|
| [`automation-plan.md`](automation-plan.md) | Automation architecture: principles, routines, labels, phases, incidents |
| [`state-machine.md`](state-machine.md) | Formal state machine: labels, transitions, retry and failure rules |
| [`skill-contract.md`](skill-contract.md) | The contract every skill file satisfies |
| [`model-routing.md`](model-routing.md) | Model catalog, routing policy, activation, budgets, arbitration |
| [`design-workflow.md`](design-workflow.md) | The mockup-before-code rule |
| [`design-catalog.md`](design-catalog.md) | The living catalog of the design system |
| [`deployment.md`](deployment.md) | CI/CD, GitHub Actions, deployment |
| [`visual-testing.md`](visual-testing.md) | Visual regression suite |
| [`navigation.md`](navigation.md) | Hash router tests |
| [`testing-google-drive.md`](testing-google-drive.md) | Google Drive sync tests |
