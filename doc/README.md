# Documentation

| Path | Content |
|---|---|
| [`functional/feature.md`](functional/feature.md) | Features and user flows |
| [`technical/architecture.md`](technical/architecture.md) | Tech stack, patterns, structure |
| [`technical/module-contract.md`](technical/module-contract.md) | The contract between the host app and a scoring module |
| [`technical/automation-plan.md`](technical/automation-plan.md) | Automation architecture: routines, phases, incidents |
| [`automation/state-machine.md`](automation/state-machine.md) | The formal state machine backing the automation plan: labels, transitions, retry/failure rules |
| [`technical/deployment.md`](technical/deployment.md) | CI/CD and deployment |
| [`technical/migrations.md`](technical/migrations.md) | Data migration history |
| [`glossary.md`](glossary.md) | Project term definitions |
| [`technical/visual-testing.md`](technical/visual-testing.md) | The visual regression suite and its baselines |
| [`../packages/module-mille-sabords/doc/`](../packages/module-mille-sabords/doc/) | 1000 Sabords: rules, user guide, technical docs, and the rulebook PDF |
| [`../packages/module-tori-valley/doc/`](../packages/module-tori-valley/doc/) | Torī Valley: rules, technical docs, the rulebook PDF and photos of the 16 Objectif cards |
| `schemas/import/` | JSON schemas for import format (v1.0, v1.1) |

**A game's documentation lives in its module's package**, next to the code that implements it —
rules, user guide, resources and technical notes alike. This directory holds what belongs to the
repository as a whole: the host app, the workspace, and the contract between them. See
[`technical/module-contract.md`](technical/module-contract.md).
