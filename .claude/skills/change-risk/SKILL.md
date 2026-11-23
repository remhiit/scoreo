---
name: change-risk
description: Transition alias — this skill now lives in the shared plugin as `dev-workflow:change-risk`, with Scoreo's overlay in `.claude/skills/project-conventions/change-risk.md`. Kept so routine prompts that still point at this path keep working; delete once every prompt names `dev-workflow:change-risk`.
---

# change-risk — transition alias

This skill moved to the shared `dev-workflow` plugin (repository
`remhiit/workflows`). This file only redirects, so that routine prompts and
older references to `.claude/skills/change-risk/SKILL.md` keep working.

1. Invoke the skill `dev-workflow:change-risk` with the Skill tool and follow it.
2. If that skill is not available in this session (plugin not loaded, e.g. in
   a sub-agent or a routine), read
   `plugins/dev-workflow/skills/change-risk/SKILL.md` from the `remhiit/workflows`
   repository (default branch) with the GitHub file-reading tool, and follow
   it. Say in your output which of the two you used.
3. Either way, the shared skill reads Scoreo's overlay:
   `.claude/skills/project-conventions/SKILL.md`, then
   `.claude/skills/project-conventions/change-risk.md`. The overlay wins on conflict.

Remove this alias once the R2–R5 routine prompts (`doc/technical/deployment.md`)
and every coordinator sub-agent launch name `dev-workflow:change-risk` directly and a
run has confirmed the plugin loads there.
