# Feuille de route : adaptation des skills Claude hors Claude Code

> **Statut : feuille de route, non livrée.** Ce document n'est PAS une procédure exécutable.
> Seul le coordinateur est adapté dans cette PR (`.claude/skills/coordinator/ADAPTED-SKILL.md`).
> Les 12 autres skills ne sont disponibles que sous leur forme Claude d'origine
> (`.claude/skills/<nom>/SKILL.md`).

## Environnements cibles et état de vérification

| Environnement | Mécanisme de découverte | Chemin consommé | Statut |
| --- | --- | --- | --- |
| Claude Code | Découverte native des skills | `.claude/skills/<nom>/SKILL.md` (frontmatter `name`, `description`) | Existant, source de vérité |
| Agent coordinateur MCP (connected services) | Aucune découverte automatique : lecture explicite via l'outil de lecture de fichiers GitHub | `.claude/skills/coordinator/ADAPTED-SKILL.md` | Livré dans cette PR |
| Mammouth Code / OpenCode | **À vérifier dans la documentation officielle** (chemin, nom de fichier, frontmatter, configuration) | Non déterminé | Non pris en charge |
| mammouth.ai (interface web) | **À vérifier** (pas de mécanisme de chargement de fichiers du dépôt identifié) | Non déterminé | Non pris en charge |

Règle : aucun chemin (`.opencode/`, `.automation/`, etc.) ne sera utilisé tant que le
mécanisme de chargement n'est pas documenté ici avec sa source. Les `SKILL.md` Claude
restent la source ; chaque cible recevra une adaptation dédiée à son emplacement vérifié.

## Skills restant à adapter (hors périmètre de cette PR)

address-feedback, arbitrate, change-risk, implement-task, issue-to-spec,
merge-review-pass, new-scoring-module, pr-review, project-conventions,
site-quality, test-strategy, weekly-report.

Pour chacun, l'adaptation devra fournir : rôle et déclencheurs, entrées et prérequis,
chargement des conventions et autres skills, séquence d'actions avec les outils
**effectivement disponibles dans la cible**, sorties et format, critères de réussite,
cas d'échec / d'outil absent / d'autorisation requise, et un exemple de bout en bout.

## En attendant

Le coordinateur utilise ces skills en lisant le `SKILL.md` d'origine et en appliquant
la procédure décrite dans son `ADAPTED-SKILL.md` (section « Utiliser un skill Claude non adapté »).
