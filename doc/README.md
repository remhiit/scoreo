# Documentation

| Path | Content |
|---|---|
| [`utilisateur/`](utilisateur/README.md) | User guide, in French: how to use Scoreo, screen by screen |
| [`workflows/`](workflows/README.md) | How work flows from issue to merge: automation chain, design workflow, CI/CD, testing guides |
| [`adr/`](adr/README.md) | Architecture Decision Records: one decision the code cannot tell per file, format and index — architecture, backward compatibility and migrations, the module contract |
| [`../apps/scoreo/e2e/`](../apps/scoreo/e2e/README.md) | The end-to-end specs, the reference for what a player can do, and their « Journeys → specs » table |
| [`workflows/automation-plan.md`](workflows/automation-plan.md) | Automation architecture: routines, phases, incidents |
| [`workflows/state-machine.md`](workflows/state-machine.md) | The formal state machine backing the automation plan: labels, transitions, retry/failure rules |
| [`workflows/deployment.md`](workflows/deployment.md) | CI/CD and deployment |
| [`workflows/visual-testing.md`](workflows/visual-testing.md) | The visual regression suite and its baselines |
| [`workflows/design-workflow.md`](workflows/design-workflow.md) | The mockup-before-code rule: when a feature needs a mockup, how it is built, validated and retired |
| [`workflows/design-catalog.md`](workflows/design-catalog.md) | The living catalog of the design system (`apps/catalog/`), its guards and how to publish a preview |
| [`../packages/module-mille-sabords/doc/`](../packages/module-mille-sabords/doc/) | 1000 Sabords: rules, user guide and the rulebook PDF |
| [`../packages/module-tori-valley/doc/`](../packages/module-tori-valley/doc/) | Torī Valley: rules, the rulebook PDF and photos of the 16 Objectif cards |
| `schemas/import/` | JSON schemas for import format (v1.0, v1.1) |

There is no functional or technical reference documentation: what the code says is read in the code
(types and JSDoc included), what it cannot say is an ADR, and what a player can do is an e2e spec.

**A game's documentation lives in its module's package**, next to the code that implements it —
rules, user guide and resources (ADR-0033). This directory holds what belongs to the repository as a
whole: the host app, the workspace, and the contract between them (the module ADRs in
[`adr/`](adr/README.md) and the types of `packages/module-api/`).
