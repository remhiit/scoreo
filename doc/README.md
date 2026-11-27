# Documentation

| Path | Content |
|---|---|
| [`utilisateur/`](utilisateur/README.md) | User guide, in French: how to use Scoreo, screen by screen |
| [`workflows/`](workflows/README.md) | How work flows from issue to merge: automation chain, design workflow, CI/CD, testing guides |
| [`functional/feature.md`](functional/feature.md) | Features and user flows |
| [`technical/architecture.md`](technical/architecture.md) | Tech stack, patterns, structure |
| [`technical/module-contract.md`](technical/module-contract.md) | The contract between the host app and a scoring module |
| [`workflows/automation-plan.md`](workflows/automation-plan.md) | Automation architecture: routines, phases, incidents |
| [`workflows/state-machine.md`](workflows/state-machine.md) | The formal state machine backing the automation plan: labels, transitions, retry/failure rules |
| [`workflows/deployment.md`](workflows/deployment.md) | CI/CD and deployment |
| [`technical/migrations.md`](technical/migrations.md) | Data migration history |
| [`adr/`](adr/README.md) | Architecture Decision Records: one decision the code cannot tell per file, format and index |
| [`glossary.md`](glossary.md) | Project term definitions |
| [`workflows/visual-testing.md`](workflows/visual-testing.md) | The visual regression suite and its baselines |
| [`workflows/design-workflow.md`](workflows/design-workflow.md) | The mockup-before-code rule: when a feature needs a mockup, how it is built, validated and retired |
| [`workflows/design-catalog.md`](workflows/design-catalog.md) | The living catalog of the design system (`apps/catalog/`), its guards and how to publish a preview |
| [`../packages/module-mille-sabords/doc/`](../packages/module-mille-sabords/doc/) | 1000 Sabords: rules, user guide, technical docs, and the rulebook PDF |
| [`../packages/module-tori-valley/doc/`](../packages/module-tori-valley/doc/) | Torī Valley: rules, technical docs, the rulebook PDF and photos of the 16 Objectif cards |
| `schemas/import/` | JSON schemas for import format (v1.0, v1.1) |

**A game's documentation lives in its module's package**, next to the code that implements it —
rules, user guide, resources and technical notes alike. This directory holds what belongs to the
repository as a whole: the host app, the workspace, and the contract between them. See
[`technical/module-contract.md`](technical/module-contract.md).
