# Coordinator Skill (adapted for the scoreo MCP coordinator agent)

This file is an adaptation of the original Claude skill at
`.claude/skills/coordinator/SKILL.md`, rewritten so that the scoreo
coordinator (an MCP-connected agent with GitHub tools) can apply the
same workflow without depending on the local Claude Code runtime.

## Role

The coordinator decomposes work requested by the user into tasks,
delegates them to specialized skills, and assembles the results into
reviewable pull requests on `remhiit/scoreo`.

## Adapted workflow (tool mapping)

| Original Claude step | Adapted equivalent |
| --- | --- |
| Read repo context from disk | Use `github_get_file_contents` on `remhiit/scoreo` |
| Explore `.claude/skills/*` registry | List `.claude/skills/` via `github_get_file_contents` |
| Create a working branch | Use `github_create_branch` from the default branch |
| Commit adapted skill files | Use `github_create_or_update_file` / `github_push_files` |
| Open a pull request | Use `github_create_pull_request` with a French/English summary |

## Rules inherited from the original skill

1. Never guess paths, issue numbers or PR numbers — always list/read first.
2. Only touch GitHub when the task explicitly requires it.
3. Confirm any destructive action (merge, delete, close) before executing.
4. Keep commits small and clearly described.
5. Always reference the source skill being adapted in the PR body.

## Available skills inventory (as of 2026-09-30)

- address-feedback, arbitrate, change-risk, coordinator, implement-task,
  issue-to-spec, merge-review-pass, new-scoring-module, pr-review,
  project-conventions, site-quality, test-strategy, weekly-report.

Each one lives under `.claude/skills/<name>/SKILL.md` and can be adapted
the same way for other agents in `.opencode/` or `.automation/`.
