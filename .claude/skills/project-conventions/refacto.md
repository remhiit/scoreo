# Scoreo overlay — `workflows:refacto`

This file is Scoreo's overlay for the shared workflow `workflows:refacto` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## etapes

- The ticket follows the same Scoreo spec format as a feature (see
  `feature.md` § etapes), with `## Maquette` stating "no visible change".
- Layering rules the refactor must keep: `SKILL.md` § architecture;
  serialized models stay backward-compatible: `SKILL.md` § compatibilite.

## pipeline

Same hand-off choice as `feature.md` § pipeline.
