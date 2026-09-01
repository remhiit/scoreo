---
name: weekly-report
description: Build the weekly observability report for the Scoreo automation pipeline — open PR age, needs-human escalations, R3 pass/fail rate, incidents logged since last report, and a recommendation on the `auto` whitelist. Use for the scheduled Monday report, or when asked to check pipeline health. This is the R6 step in doc/technical/automation-plan.md.
---

# Weekly Report

Builds the data-driven case for expanding, holding, or restricting the
`automation:enabled` whitelist (`automation-plan.md` §5) — the plan explicitly forbids growing
that whitelist "on intuition" (§1, Phase 6). This skill only reports; it
never edits the whitelist itself. See `project-conventions` for repo layout
conventions referenced below.

**Not yet autonomous.** Per `automation-plan.md` §6 ("une skill non éprouvée
en interactif ne passe pas en autonome"), this skill runs interactively
until it's been rodée on a few real weeks. Creating the scheduled routine
that fires it is Rémi's call, made after that rodage — out of scope for
this skill and for the issue that introduced it.

## Data sources — GitHub MCP tools only

Every section below is built strictly from the GitHub MCP tools available
to a Claude Code session here (`list_issues`, `search_issues`,
`list_pull_requests`, `search_pull_requests`, `pull_request_read`,
`get_file_contents`). No `gh` CLI, no raw API, no repo secrets.

### Reporting window

Find the previous report by searching `is:issue in:title "Rapport hebdo"`,
sorted by creation date descending. The window is from that issue's
`created_at` to now. If none exists (first run), use the last 7 days.

### 1. PR ouvertes depuis plus de 3 jours

`list_pull_requests` (state `open`), filter to `created_at` older than 3
days. For each: number, title, age in days, current labels (the label state
is itself informative — e.g. still `needs-review` after 3 days signals a
stuck R3, not just a slow human).

### 2. Issues `needs-human` ouvertes

`search_issues` with `is:issue is:open label:needs-human`. Each one is a
pipeline failure to document, not just a to-do: note which routine
escalated it (R2/R3/R4, inferred from context — e.g. an `attempt-3` history
implies R4) and why, if it's discoverable from the issue/PR comments.

### 3. Verdicts R3 de la semaine écoulée

Count `review-pass` vs `needs-fix` for the window, via
`search_pull_requests` (`is:pr label:review-pass updated:>=<window-start>`
and the same for `label:needs-fix`) or by reading PRs merged in the window
and checking their final review label. **This is an approximation, not an
exact count**: `needs-fix` is cleared once a fix lands (per
`address-feedback/SKILL.md`), so a PR that cycled through `needs-fix` once
before eventually passing shows up as `review-pass` only — the search
undercounts total review attempts, it does not undercount final outcomes.
State the counts and the resulting `needs-fix` rate (the plan's main
indicator, per this issue's acceptance criteria) — this rate is what the
recommendation in §5 leans on.

### 4. Incidents consignés dans `automation-plan.md` depuis le rapport précédent

`get_file_contents` on `doc/technical/automation-plan.md`. Each incident is
its own `**Incident (YYYY-MM-DD) — ...**` paragraph under a Phase section.
List every one dated inside the reporting window, with a one-line summary
and which phase/routine it was found in.

### 5. Recommandation

One explicit line: **élargir** / **maintenir** / **restreindre** la liste
blanche `auto`, justified by §§1-4 above — not a vibe. A low `needs-fix`
rate with zero new incidents supports élargir; any open `needs-human` from
this window or a rising `needs-fix` rate supports maintenir/restreindre.

### Ce que ce rapport ne peut pas mesurer

Le nombre de runs de routines consommés n'est pas exposé par l'API GitHub
(aucun outil MCP ne liste les invocations d'une Routine). Il est approximé
par le nombre d'événements de labels R2/R3/R4 de la semaine — `ready` posé
(R2), `needs-review` posé (R3), `needs-fix` posé (R4) — compté via
`search_issues`/`search_pull_requests` sur ces labels et la fenêtre de
dates. Dire explicitement dans le rapport que c'est une approximation, pas
un décompte de runs.

## Livrable

Le rapport est une **issue GitHub**, jamais une PR ni un commentaire :

1. `mcp__github__issue_write` : titre `Rapport hebdo <YYYY-MM-DD>` (date du
   jour du run), corps = les sections 1 à 5 ci-dessus plus la limite de
   mesure.
2. Label `P3` dans son propre appel.
3. Ne jamais poser `ready` — ce n'est pas un ticket à implémenter.

## Which run

- **As R6** (once the scheduled routine exists): runs on its own trigger,
  no issue in context to read first — this skill's whole job is building
  the report from scratch each time.
- **Interactive** (asked directly, or during rodage): same workflow, run on
  demand.
