# Scoreo overlay — `test-strategy`

This file is Scoreo's overlay for the shared skill `dev-workflow:test-strategy`
(plugin `dev-workflow` from the `remhiit/workflows` marketplace). The shared
skill reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where the
two disagree, **this file wins**. It holds only what is specific to Scoreo:
its paths and commands, and its automation pipeline (labels, routines R2–R5,
the coordinator and its sub-agents, traceability). Everything generic lives in
the shared skill, so an improvement made there reaches Scoreo unless this
file overrides that point.

Section titles keep the names they had when this skill lived in
`.claude/skills/test-strategy/SKILL.md`, so a reference such as
`test-strategy/SKILL.md` § "X" elsewhere in the repo now means § "X" of this file.
Step numbers ("step 6") refer to the shared skill's procedure, which keeps the
same numbering.

## Scoreo test layers

The repo runs three suites (`doc/workflows/visual-testing.md` § "The repo has
three test suites" — this skill only ever reaches into the first two):

| Layer | Where | Runner |
|---|---|---|
| Unit | `ui/*/​*Reducer.test.ts`, `application/*.test.ts`, `domain/**/*.test.ts` | Vitest (jsdom, no DOM needed) |
| Component/UI | `ui/*/​*.test.tsx` (React Testing Library) | Vitest + jsdom |
| Integration | Use case exercised against a real port adapter (e.g. `infrastructure/localStorage/*.test.ts`), or a reducer/component test that exercises more than one collaborator together | Vitest (jsdom) |
| End-to-end | `apps/scoreo/e2e/*.spec.ts` | Playwright + Chromium |


E2E is the most expensive suite here: reserve it for what nothing smaller can
catch, except that every behavior a player can see has one (the
« Journeys → specs » table of `apps/scoreo/e2e/README.md` is the precedent to
match, and a new journey adds its row there). Visual-regression scenarios belong to `doc/workflows/visual-testing.md`'s
own suite (`*.visual.spec.ts`), never to this skill's output.
