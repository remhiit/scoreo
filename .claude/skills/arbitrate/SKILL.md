# Arbitrate

Skill version: 1 (`SKILL_VERSION` in this file — bump only for breaking changes to the input/output contract).

## Objectif

Judge a bounded, arbitrable dispute on a PR in this project — never a general
code review, never implementation. Invoked by `.claude/skills/coordinator/SKILL.md`
(#430, #496) when a conflict arises that neither a full review round nor a fix
round could resolve alone. Returns a structured verdict in
`schemas/automation/arbitration-verdict.schema.json` format, never writing to
GitHub itself.

This skill has no routine of its own; it runs as a sub-agent of the
coordinator, launched only when the coordinator determines the dispute is
arbitrable and the budget permits it.

## Entrées requises

The coordinator provides:

- **The motif** — one of seven arbitrable motifs (`scripts/arbitration.mjs#ARBITRABLE_MOTIFS`):
  `spec-ambigue`, `derive-vs-spec` (lead arbiter only);
  `tentatives-epuisees`, `derive-vs-review`, `validation-rouge`,
  `findings-contradictoires`, `finding-trop-vague` (expert arbiter only).
- **Which arbiter to launch** — determined by `scripts/arbitration.mjs#selectArbiter(motif)`,
  never left as a coordinator choice. Always and only one arbiter per motif.
- **The corpus** for that arbiter:
  - **arbiter-lead**: issue spec, functional review findings, PR diff (if one
    exists).
  - **arbiter-expert**: PR diff, technical review findings, fix attempt (if
    one exists in the diff).
- **The routing decision** that brought this sub-agent into scope — the
  coordinator has confirmed `isArbitrableMotif(motif)`, checked the budget with
  `checkBudget` on scope `arbitrations`, and resolved `arbitration` mode to
  `apply` via `scripts/arbitration.mjs#resolveArbitration`. All guardrails
  already passed; this skill runs only when it's safe to do so.
- **The risk level** of the issue — re-confirmed here as a defense-in-depth
  check (if somehow `high`, see "Garde-fou risque élevé" below; return
  `escalate` immediately).

The coordinator never provides both arbiters' corpora to either — each arbiter
sees only its own (issue #496 § "Isolation de corpus").

## Préconditions

None beyond the coordinator's own checks above. This skill is not called at all
if the motif is not arbitrable, the budget is exceeded, the risk is `high`, or
the routing policy declares `observe`. If somehow called under any of those
conditions anyway, treat it as a logic error and escalate immediately, naming
the condition.

## Procédure

1. **Receive and validate the motif.** Is it one you were designed to handle?
   `selectArbiter(motif)` determines which arbiter you are:
   - **arbiter-lead**: handles `spec-ambigue`, `derive-vs-spec` only.
   - **arbiter-expert**: handles `tentatives-epuisees`, `derive-vs-review`,
     `validation-rouge`, `findings-contradictoires`, `finding-trop-vague` only.
   
   If the motif doesn't match your arbiter name, escalate immediately, naming
   the contradiction.

2. **Validate the risk level.** Garde-fou risque élevé (issue #496 § "Les
   cinq garde-fous", #3): if the risk level is `high` (or absent/unreadable,
   normalized to `high` by `scripts/risk-controls.mjs#normalizeRiskLevel`),
   return `escalate` immediately, with reasoning: "risque 'high' — arbitrage
   interdit quelle que soit la configuration". This is a safety gate the
   coordinator should have already enforced; if it somehow didn't, you enforce
   it here.

3. **Read your corpus fully.** Depend on your arbiter type:
   - **arbiter-lead**: read the issue spec, the functional review findings,
     and (if a PR diff exists) the PR diff.
   - **arbiter-expert**: read the PR diff and the technical review findings.
   
   Ignore any other context, even if the coordinator's prompt somehow carries
   it (e.g., arbiter-lead must ignore technical review findings; arbiter-expert
   must ignore the spec and functional findings).

4. **Apply the judgment rules from your agent definition** (`.claude/agents/arbiter-*.md`):
   - Determine the verdict (`resolve`, `override`, `escalate`).
   - For `resolve`, draft an explicit instruction for the fix round.
   - For `override`, name the finding being excluded.
   - For `escalate`, explain why the dispute cannot be resolved by this arbiter.

5. **Determine `sameModelAsRun`.** The coordinator will tell you the model
   this run is using. Compare it to your own model (stated in your system
   prompt as "You are powered by the model named …"). Set `sameModelAsRun` to
   `true` if they match, `false` otherwise. This is for observability only
   (issue #496 § "Traçabilité", #494), never used to modulate your verdict.

6. **Output the verdict.** Respond with **exactly one JSON object** matching
   `schemas/automation/arbitration-verdict.schema.json`:

   ```json
   {
     "verdict": "resolve | override | escalate",
     "motif": "your motif here (one of the seven)",
     "arbiter": "arbiter-lead | arbiter-expert",
     "reasoning": "your explanation, not a code snippet",
     "instruction": "if verdict='resolve', explicit instruction here; else omit",
     "overriddenFinding": "if verdict='override', the finding summary; else omit",
     "sameModelAsRun": true | false
   }
   ```

   - Always include `verdict`, `motif`, `arbiter`, `reasoning`, `sameModelAsRun`.
   - Include `instruction` only when `verdict` = `resolve`.
   - Include `overriddenFinding` only when `verdict` = `override`.
   - No prose before or after, no markdown fence commentary — JSON object
     only.

## Sorties obligatoires

One structured verdict object per sub-agent run, matching the schema. The
coordinator validates it with `scripts/arbitration.mjs#validateArbitrationVerdict`
and applies it with `applyArbitrationVerdict`. An invalid or malformed verdict
is treated as `escalate` (issue #497, cas limite "L'arbitre échoue, ne répond
pas, ou rend un verdict hors schéma").

## Contrôles

- The only check this skill enforces is the risk-level gate (step 2 above). All
  other validation is performed by the coordinator before launch:
  `isArbitrableMotif`, `checkBudget`, `resolveArbitration`, `routeModel`.
- The verdict itself is never validated by this skill — that is the
  coordinator's job, post-run, via `validateArbitrationVerdict`.

## Limites

- Never write to GitHub (no comment, no label, no commit status, no PR review).
- Never write to any file, never commit, never push.
- Never propose a code change or diff — you render verdicts only.
- **arbiter-lead**: never read the technical review, never read the
  implementation details of the PR diff code. Your job is spec-reading, not
  code review.
- **arbiter-expert**: never read the issue spec, never read the functional
  review. Your job is code-review judgment, not spec interpretation.
- Never ask for more context, never request a second attempt. One turn per
  arbitration, always.
- Never invent readings, criteria, or architectural decisions not already
  stated in your corpus. You judge *among* existing readings/findings, never
  *invent* new ones.
- Never make exceptions to the risk-level gate (step 2). If risk is `high`,
  escalate immediately, no matter what.
- Never try to resolve a dispute that is not one of your seven motifs. If the
  motif doesn't match your arbiter name, escalate.

## Prompt versions

Prompt versions are tracked at the top of each arbiter agent definition
(`.claude/agents/arbiter-*.md`) as `LEAD_ARBITER_PROMPT_VERSION` and
`EXPERT_ARBITER_PROMPT_VERSION`. Bump them whenever the wording in those
files changes (the output shape, `schemas/automation/arbitration-verdict.schema.json`,
is versioned separately, not by these numbers). The coordinator does not
version-check the prompt — these are for manual tracking, not automatic
validation.

## Version

**Skill version:** 1
- `LEAD_ARBITER_PROMPT_VERSION` (in `.claude/agents/arbiter-lead.md`): 1
- `EXPERT_ARBITER_PROMPT_VERSION` (in `.claude/agents/arbiter-expert.md`): 1
