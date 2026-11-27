# Scoreo overlay — `change-risk`

This file is Scoreo's overlay for the shared skill `dev-workflow:change-risk`
(plugin `dev-workflow` from the `remhiit/workflows` marketplace). The shared
skill reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where the
two disagree, **this file wins**. It holds only what is specific to Scoreo:
its paths and commands, and its automation pipeline (labels, routines R2–R5,
the coordinator and its sub-agents, traceability). Everything generic lives in
the shared skill, so an improvement made there reaches Scoreo unless this
file overrides that point.

Section titles keep the names they had when this skill lived in
`.claude/skills/change-risk/SKILL.md`, so a reference such as
`change-risk/SKILL.md` § "X" elsewhere in the repo now means § "X" of this file.
Step numbers ("step 6") refer to the shared skill's procedure, which keeps the
same numbering.

## risque — Scoreo surfaces

These paths replace the shared skill's generic examples.

### Surfaces à risque

Eight fixed categories, each with the repo paths/patterns that trigger it.
A file can trigger more than one category; § Niveau below is how that's
resolved (highest wins, never averaged).

| Surface | Déclencheurs (chemins/motifs) |
|---|---|
| **Persistance & migrations** | `apps/scoreo/src/infrastructure/localStorage/**`, `apps/scoreo/src/infrastructure/migration/**`, tout schéma zod dans `apps/scoreo/src/domain/model/**` |
| **Règles de scoring** | `apps/scoreo/src/application/eloCalculator.ts`, `apps/scoreo/src/application/createMatchUseCase.ts`, `apps/scoreo/src/application/rankingToMatch.ts`, `packages/module-*/src/domain/**`, `packages/module-mille-sabords/tests/golden/**` (le diff différentiel contre l'oracle `legacy/`) |
| **API / contrats** | `packages/module-api/**` (contrat hôte↔module), `packages/shared-domain/**`, `schemas/import/**` (format d'import versionné), `apps/scoreo/src/domain/port/**` |
| **Authentification & autorisations** | `apps/scoreo/src/infrastructure/google/**` (OAuth, `DriveClient`, `SyncConfig`) — la seule surface d'auth du dépôt |
| **Secrets** | toute variable d'environnement ou clé/jeton ajouté ou modifié, `.env*`, un secret référencé dans `.github/workflows/**`, une valeur qui ressemble à une clé API en dur dans le diff |
| **Configuration** | `apps/scoreo/vite.config.ts`, `tsconfig*.json` (racine ou `apps/scoreo/`), `eslint.config.js`, `lighthouserc.json`, `package.json` (scripts ou dépendances, racine ou `apps/scoreo/`), `pnpm-workspace.yaml` |
| **Déploiement** | `.github/workflows/**` (dont `deploy.yml`, `ci.yml`), `apps/scoreo/public/manifest.json`, `apps/scoreo/public/sw.js` |
| **Concurrence** | tout code de résolution de conflit ou de synchronisation (`DriveSyncAdapter*`, `SyncConfig*`, `SyncUseCase*`), tout accès concurrent à `localStorage` entre onglets |

Un fichier hors de ces huit surfaces (contenu, documentation, style, refacto
local sans changement de comportement public) n'active aucune surface —
c'est le cas `low` explicite du § Niveau, jamais un silence.

**Compatibilité** n'est pas une neuvième surface au même titre que les
huit ci-dessus : c'est une aggravation transversale, vérifiée sur toute
surface sérialisée touchée — un champ ajouté sans `.default()` zod, ou un
champ supprimé/renommé sans entrée dans `doc/technical/migrations.md`,
fait toujours monter le niveau de cette surface d'un cran (voir § Niveau).


## Conséquences par niveau

| Niveau | Tests | Revue | Merge |
|---|---|---|---|
| `low` | La stratégie de tests standard (`test-strategy`'s "Obligatoires") suffit, rien à renforcer | Revue normale (`pr-review` standard) | Éligible à `automation:enabled` si `issue-to-spec` l'a aussi classée **Faible** (§ Articulation) |
| `medium` | `test-strategy` doit inclure au moins un scénario par surface touchée (ex. persistance → un test de round-trip/migration ; scoring → une valeur de référence) | Revue humaine recommandée avant merge ; `pr-review` porte une attention dédiée à la ou les surfaces touchées | Jamais `automation:enabled`, quelle que soit la catégorie `issue-to-spec` — merge manuel |
| `high` | `test-strategy` obligatoire et exhaustif sur chaque surface touchée, y compris les cas d'erreur/limite de cette surface | Revue humaine obligatoire, plus une **security review** si Secrets/Auth est en cause, plus une **architecture review** si un contrat/port est restructuré | Merge bloqué jusqu'à levée explicite par un humain ; jamais `automation:enabled` ; `pr-review` doit porter ce finding en `blocking` |

## Articulation avec `issue-to-spec`

Les deux échelles ne se fusionnent pas (elles répondent à deux questions
différentes) mais se recoupent :

- `issue-to-spec`'s **Faible**/**Élevé** est une décision binaire prise une
  fois, à la création de l'issue, sur la seule base des fichiers impactés
  *prévus* — elle gouverne l'éligibilité à `automation:enabled`
  (`doc/workflows/automation-plan.md` §5).
- Ce skill produit une évaluation à trois niveaux, faite sur le diff *réel*
  (ou la spec à défaut), enrichie de preuves et de mitigations — elle sert
  de guide de profondeur de validation à `implement-task`, `test-strategy`,
  `pr-review` et `site-quality`, pas de porte d'entrée à l'auto-merge.
- **Correspondance, jamais fusion** : toute surface qui ferait classer une
  issue **Élevé** chez `issue-to-spec` (modèles sérialisés/migrations,
  ports/adapters, `apps/scoreo/public/`, config Vite/TS, navigation) ne peut
  jamais produire un `low` ici — au minimum `medium`, souvent `high` selon
  § Niveau. L'inverse n'est pas vrai : ce skill détecte des surfaces
  (scoring, auth, secrets, concurrence) qu'`issue-to-spec`'s binaire ne
  couvre pas — un `medium`/`high` ici n'implique donc pas que
  `issue-to-spec` se soit trompée en classant **Faible**, seulement que la
  question posée était différente.
- Ce skill ne recalcule ni ne réécrit jamais la catégorie `issue-to-spec`
  d'une issue existante — voir § Limites.
