---
name: issue-to-spec
description: Transition alias — this skill now lives in the shared plugin as `dev-workflow:issue-to-spec`, with Scoreo's overlay in `.claude/skills/project-conventions/issue-to-spec.md`. Kept so routine prompts that still point at this path keep working; delete once every prompt names `dev-workflow:issue-to-spec`.
---

# issue-to-spec — transition alias

This skill moved to the shared `dev-workflow` plugin (repository
`remhiit/skills`). This file only redirects, so that routine prompts and
older references to `.claude/skills/issue-to-spec/SKILL.md` keep working.

1. Invoke the skill `dev-workflow:issue-to-spec` with the Skill tool and follow it.
2. If that skill is not available in this session (plugin not loaded, e.g. in
   a sub-agent or a routine), read
   `plugins/dev-workflow/skills/issue-to-spec/SKILL.md` from the `remhiit/skills`
   repository (default branch) with the GitHub file-reading tool, and follow
   it. Say in your output which of the two you used.
3. Either way, the shared skill reads Scoreo's overlay:
   `.claude/skills/project-conventions/SKILL.md`, then
   `.claude/skills/project-conventions/issue-to-spec.md`. The overlay wins on conflict.

Remove this alias once the R2–R5 routine prompts (`doc/technical/deployment.md`)
and every coordinator sub-agent launch name `dev-workflow:issue-to-spec` directly and a
run has confirmed the plugin loads there.
