# Scoreo overlay — `workflows:feature`

This file is Scoreo's overlay for the shared workflow `workflows:feature` (plugin `workflows`, `remhiit/workflows` marketplace). The workflow reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where they disagree, **this file wins**. It restates nothing: each rule lives in the per-skill overlay it points to.

## etapes

- **Mockup first.** A feature a player sees is mocked up in the catalog and
  validated by the merge of its mockup PR before any spec: rule and procedure
  in `issue-to-spec.md` § "Mockup first (features a player sees)" and
  `doc/technical/design-workflow.md`. This runs at the workflow's step 3,
  after the interview.
- **Spec format.** After `to-spec`, complete the issue with Scoreo's
  mandatory sections, so the pipeline can read it: `## Maquette`
  (`issue-to-spec.md` § "Spec format — Scoreo additions"), `## Dépendances`
  (§ "Dépendances"), the risk category (§ "Determining the risk category",
  surfaces in `change-risk.md`) and the traceability line (§ "Traçabilité").
  The readiness verdict follows § "Determining the readiness verdict".
- Issues, specs and the decisions comment are written in French (`CLAUDE.md`
  § Langue).

## pipeline

Handing off a ready ticket (workflow step 5–6) is a choice to make with the
human, because Scoreo has its own orchestrator:

- **To the automation pipeline** (default): pose the priority label, then the
  queue label alone, in separate calls, exactly as `issue-to-spec.md`
  § "Labels" says (`automation:queued`, or `blocked`; never
  `automation:ready`). The `coordinator` routine then implements, reviews and
  fixes the ticket. Do **not** also run `workflows:livrer` on it.
- **Now, in this session**: pose only the priority label, no queue label, and
  run `workflows:livrer` on the ticket.
