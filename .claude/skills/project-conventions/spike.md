# Scoreo overlay — `workflows:spike`

This file is Scoreo's overlay for the shared workflow `workflows:spike` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## etapes

- Research notes stay in the spike's issue or PR; a decision the spike
  settles becomes an ADR in `doc/adr/` (English, `CLAUDE.md` § Langue;
  format and life cycle in `doc/adr/README.md`, index regenerated with
  `node scripts/check-adr.mjs --write`). The summary to Rémi is in French.
- A prototype that touches the UI goes in `apps/catalog/src/mockups/<topic>/`
  (`doc/workflows/design-workflow.md`), never in `apps/scoreo/src/`.
