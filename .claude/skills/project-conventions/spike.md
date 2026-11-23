# Scoreo overlay — `workflows:spike`

This file is Scoreo's overlay for the shared workflow `workflows:spike` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## etapes

- Research notes and decision notes go in `doc/technical/` (English,
  `CLAUDE.md` § Langue), named `<topic>-decision.md`; the summary to Rémi is
  in French.
- A prototype that touches the UI goes in `apps/catalog/src/mockups/<topic>/`
  (`doc/technical/design-workflow.md`), never in `apps/scoreo/src/`.
