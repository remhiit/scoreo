# Scoreo overlay — `workflows:maintenance`

This file is Scoreo's overlay for the shared workflow `workflows:maintenance` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## etapes

Scoreo's commands, Lighthouse baselines, PWA checks and the zones a quick fix
must not touch are in `site-quality.md` § "Procédure — Scoreo values" and
§ "Limites — what this skill does not do". The routine version of this work is R5 (`site-quality.md`);
this workflow is the interactive or manual equivalent and follows the same
values.

## pipeline

PRs opened here carry no `automation:*` label; the merge stays Rémi's.
