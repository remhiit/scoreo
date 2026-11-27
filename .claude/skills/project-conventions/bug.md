# Scoreo overlay — `workflows:bug`

This file is Scoreo's overlay for the shared workflow `workflows:bug` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## verifications, branche, commit, revue, PR

As `livrer.md`, with a `fix/<issue-number>-<slug>` branch.

## etapes

- The regression test goes at the lowest Scoreo test layer that reproduces
  the bug: layers in `test-strategy.md` § "Scoreo test layers".
- A fix touching a risk surface (`change-risk.md` § "Surfaces à risque") is
  never a quick fix: say so in the PR and leave the merge to Rémi.

## pipeline

Same ownership rule as `livrer.md` § pipeline: an issue with an
`automation:*` label belongs to the pipeline.
