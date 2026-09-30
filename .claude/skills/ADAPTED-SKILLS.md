# Adaptation des skills Claude pour le coordinateur MCP GitHub (scoreo)

> Extension de `.claude/skills/coordinator/ADAPTED-SKILL.md`.
> Chaque skill d'origine reste inchangé dans son dossier ; ce document décrit
> comment le coordinateur exécute chaque skill via les outils MCP GitHub
> disponibles : `get_file_contents`, `create_branch`,
> `create_or_update_file`, `create_pull_request`, `search` (repos, issues, PR).

## Conventions communes à toutes les adaptations

- Lire le SKILL.md d'origine avant d'agir (`get_file_contents`), ne jamais deviner son contenu.
- Aucune action d'écriture (branche, commit, PR, merge) sans demande explicite de l'utilisateur.
- Actions destructives (fermer une issue, merger une PR, supprimer une branche) : toujours confirmer avant.
- Jamais deviner un chemin, un numéro d'issue/PR, un SHA : rechercher d'abord.
- Commits petits, message clair, sur une branche dédiée.

## Mapping par skill

### address-feedback
Original : traiter les retours de review sur une PR.
Adaptation : récupérer les commentaires via la vue PR (`get_file_contents` sur `refs/pull/{n}/head` pour l'état du code), corriger sur la branche de la PR via `create_or_update_file`, répondre dans la PR. Ne jamais merger sans validation.

### arbitrate
Original : trancher un désaccord technique/design.
Adaptation : collecter les positions via recherche d'issues/PR, exposer les options et le critère de décision à l'utilisateur, appliquer la décision uniquement après confirmation (commit ou PR).

### change-risk
Original : évaluer le risque d'un changement (rayon d'impact).
Adaptation : lecture seule — `get_file_contents` et recherche de code pour cartographier les dépendances du module touché ; produire une analyse de risque écrite. Aucune écriture requise.

### implement-task
Original : implémenter une tâche définie dans un spec/issue.
Adaptation : lire le spec (`get_file_contents`), créer/branche dédiée (`create_branch`), implémenter fichier par fichier (`create_or_update_file`, SHA obligatoire pour les fichiers existants), ouvrir une PR (`create_pull_request`) référençant l'issue.

### issue-to-spec
Original : transformer une issue en spec implémentable.
Adaptation : récupérer l'issue, produire un document de spec (critères d'acceptation, découpage), le committer dans `docs/specs/` ou le proposer dans l'issue — pas de code modifié.

### merge-review-pass
Original : vérifier qu'une PR est prête à merger (CI, reviews, conflits).
Adaptation : vérifier l'état de la branche/CI, vérifier l'existence d'au moins une review passée ; proposer le merge mais demander confirmation explicite avant tout merge.

### new-scoring-module
Original : créer un nouveau module de scoring conforme aux conventions du projet.
Adaptation : lire `project-conventions` + un module existant comme référence, créer les fichiers du module + tests sur une branche, PR vers `main` avec checklist de conformité.

### pr-review
Original : review d'une PR.
Adaptation : lire le diff/les fichiers de `refs/pull/{n}/head`, comparer avec `main`, produire une review structurée (bloquant / suggestion / nit). La review est publiée comme commentaire ou listée dans la conversation — pas de modification de code.

### project-conventions
Original : référentiel des conventions du projet scoreo.
Adaptation : lecture seule, toujours charger avant `implement-task` / `new-scoring-module` / toute écriture de fichier, pour imposer style, structure et nomenclature.

### site-quality
Original : audit qualité du site/app.
Adaptation : lecture du code et des configs pertinentes, rapport d'audit (accessibilité, perf, cohérence) sans modification directe ; corrections via PR si demandé.

### test-strategy
Original : définir la stratégie de tests d'une fonctionnalité.
Adaptation : lecture du code visé, production d'un plan de tests (unitaires, intégration, cas limites) committé avec le spec ou inclus dans la PR.

### weekly-report
Original : rapport hebdomadaire d'avancement.
Adaptation : lecture seule — lister issues/PRs ouvertes/fermées de la semaine, produire un résumé (livré, en cours, risques). Aucune écriture.

## Priorités d'orchestration

1. Toute tâche d'implémentation : `project-conventions` → `implement-task` (→ `test-strategy` si précisé).
2. Toute PR : `pr-review` → `address-feedback` → `merge-review-pass`.
3. `change-risk` et `site-quality` sont consultatifs et précèdent les décisions d'écriture.
