# Scoreo overlay — `workflows:livrer`

This file is Scoreo's overlay for the shared workflow `workflows:livrer` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## pipeline

- **Who owns the ticket.** If the issue carries any `automation:*` label
  (`queued`, `ready`, `in-progress`…), the automation pipeline owns it: stop
  and say so; never run two orchestrators on one issue. `workflows:livrer`
  is for tickets handed off "now, in this session" (`feature.md`
  § pipeline), or for Rémi's manual runs.
- Never pose `automation:enabled` or enable auto-merge from this workflow;
  the merge stays Rémi's.

## branche, commit

- Branch: `implement-task.md` § "Step 2 — branch".
- One commit per ticket, message = issue title, with the trailers of
  `SKILL.md` § tracabilite (`Skill: workflows:livrer`).

## verifications

Full suite before the PR: `implement-task.md` § "Step 6 — verify green";
visual check for a visible change: § "Step 7 — visual check"; docs to update:
§ "Step 8 — docs".

## revue

Scoreo replaces the two default axes with its own two corpora, functional and
technical: `pr-review.md` § "Context isolation (coordinator sub-agent only)"
for what each reviewer may read, § "1. Run the checklist (Scoreo checklist with corpus tags)" for the items of
each corpus, § "2. Classify every finding — Scoreo additions" for the classification. The
functional reviewer reads the issue's spec, the diff, the e2e suite
(`apps/scoreo/e2e/` and its README's table) and `doc/utilisateur/`; the
technical reviewer reads the diff, `doc/adr/` and `project-conventions`, and
never the issue. Each follows
`mattpocock-skills:code-review` for its corpus only, on the spot, plus that
checklist.

## PR

Body per `implement-task.md` § "Step 10 — PR" (the six fields of
`doc/workflows/skill-contract.md` §2), with `Closes #N`. Ready for review,
not draft; no `automation:*` label.
