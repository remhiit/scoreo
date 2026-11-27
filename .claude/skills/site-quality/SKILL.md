---
name: site-quality
description: Transition alias — this skill now lives in the shared plugin as `dev-workflow:site-quality`, with Scoreo's overlay in `.claude/skills/project-conventions/site-quality.md`. Kept so routine prompts that still point at this path keep working; delete once every prompt names `dev-workflow:site-quality`.
---

# site-quality — transition alias

This skill moved to the shared `dev-workflow` plugin (repository
`remhiit/workflows`). This file only redirects, so that routine prompts and
older references to `.claude/skills/site-quality/SKILL.md` keep working.

1. Invoke the skill `dev-workflow:site-quality` with the Skill tool and follow it.
2. If that skill is not available in this session (plugin not loaded, e.g. in
   a sub-agent or a routine), read
   `plugins/dev-workflow/skills/site-quality/SKILL.md` from the `remhiit/workflows`
   repository (default branch) with the GitHub file-reading tool, and follow
   it. Say in your output which of the two you used.
3. Either way, the shared skill reads Scoreo's overlay:
   `.claude/skills/project-conventions/SKILL.md`, then
   `.claude/skills/project-conventions/site-quality.md`. The overlay wins on conflict.

Remove this alias once the R2–R5 routine prompts (`doc/workflows/deployment.md`)
and every coordinator sub-agent launch name `dev-workflow:site-quality` directly and a
run has confirmed the plugin loads there.
