---
name: change-risk
description: Assess a change's risk level (low/medium/high) from its spec and diff — detects which sensitive surfaces it touches (persistence/migrations, scoring rules, API/contracts, auth, secrets, configuration, deployment, concurrency, backward-compat), assigns a level with evidence, and states the mitigations that level requires (reinforced tests, human review, security review, architecture review, merge block). Not yet invoked by any routine (wiring it into implement-task/pr-review/site-quality is future work, out of scope of this file — see doc/technical/automation-plan.md §6); use it interactively, or as a step inside another skill's own procedure, whenever a spec or diff needs a risk read before or during implementation/review.
---

# Change Risk

## Objectif

Reads a spec, its impacted-files list, and (when available) the actual diff,
to answer one question precisely: how risky is this change, and why? The
output is a level (`low`/`medium`/`high`), the evidence behind it (which
surfaces it touches and how), and the mitigations that level demands. It
never blocks a merge or poses a GitHub label itself — that enforcement
belongs to whichever skill calls this one (`implement-task`, `pr-review`,
`site-quality`), once that wiring is done (out of scope of this file, see
`doc/technical/automation-plan.md` §6); this skill only produces the
judgment those callers would act on. It also never decides
`issue-to-spec`'s own **Faible**/**Élevé** risk category — see
§ Articulation avec `issue-to-spec` below for how the two scales relate
without merging into one.

## Entrées requises

- The spec's `## Fichiers impactés` and, when present, `## Catégorie de
  risque` (the `issue-to-spec` **Faible**/**Élevé** binary) and `## Périmètre`
  / `## Hors scope`.
- The diff, or at minimum the list of changed files with their change kind
  (added/modified/removed). When neither the diff nor a file list is
  available, this skill still runs — see § Préconditions.
- Code context for any touched path whose sensitivity isn't obvious from the
  path alone (e.g. whether a new field carries a zod `.default()`, whether a
  removed field has a `doc/technical/migrations.md` entry) — `doc/
  reference.md`'s tables are the fastest index.

## Préconditions

Not GitHub-triggered on its own — invoked interactively or from inside
another skill's procedure, never by a label event. It therefore has neither
a "which issue/PR" rule nor a "claim the run" step
(`doc/automation/skill-contract.md` §1.4): both apply only to label-triggered
routines, and this skill is neither.

Before scoring anything, check what's actually available:

- **Diff empty or unavailable** — do not default to `low`. Run § Procédure
  step 1 against the spec alone (impacted files, périmètre, description of
  the change) and say explicitly, in the output's evidence, that the level
  is spec-derived because no diff was available — a caller relying on this
  output needs to know the assessment is weaker than a diff-backed one.
- **Neither a diff nor a spec with impacted files** — this is the one true
  stop condition (ambiguous/incomplete input, `skill-contract.md` §3.1):
  there is nothing to detect surfaces from. Say so and return control to
  whatever invoked this skill rather than guessing a level.

## Surfaces à risque

Eight fixed categories, each with the repo paths/patterns that trigger it.
A file can trigger more than one category; § Niveau below is how that's
resolved (highest wins, never averaged).

| Surface | Déclencheurs (chemins/motifs) |
|---|---|
| **Persistance & migrations** | `apps/scoreo/src/infrastructure/localStorage/**`, `apps/scoreo/src/infrastructure/migration/**`, tout schéma zod dans `apps/scoreo/src/domain/model/**` |
| **Règles de scoring** | `apps/scoreo/src/application/*Score*`, `apps/scoreo/src/application/EloCalculator*`, `packages/module-*/src/domain/**`, `packages/module-mille-sabords/tests/golden/**` (le diff différentiel contre l'oracle `legacy/`) |
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

## Procédure

### 1. Rassembler les preuves

Pour chaque fichier du diff (ou, à défaut, de `## Fichiers impactés`) :
note le chemin, la nature du changement (ajout/modification/suppression),
et à quelle(s) surface(s) ci-dessus il correspond, le cas échéant. Un
fichier qui ne correspond à aucune surface est noté explicitement "aucune
surface" plutôt qu'omis — c'est la preuve qui justifiera un `low` explicite.

### 2. Vérifier l'aggravation de compatibilité

Pour chaque surface touchant un modèle sérialisé (persistance, API/contrats,
scoring si le modèle de résultat change) : le diff ajoute-t-il un champ sans
`.default()` zod ? Supprime-t-il ou renomme-t-il un champ sans entrée
`doc/technical/migrations.md` ? Si oui, note-le comme preuve — cette surface
ne peut alors pas rester `low` ni `medium`, voir § Niveau.

### 3. Assigner le niveau

Une seule règle : **le niveau retenu est celui de la surface la plus
sévère touchée, jamais une moyenne.** Une issue qui touche à la fois de la
documentation (`low`) et un port (`high` potentiel) est `high` en entier.

- **`low`** — aucune surface touchée (le cas "aucune surface" du §
  précédent), ou une surface touchée par un changement strictement additif
  et non sérialisé (ex. un nouveau test, une clarification de message
  d'erreur dans une use case déjà `low`). Toujours accompagné de la raison,
  jamais un défaut silencieux.
- **`medium`** — exactement une surface touchée par un changement contenu et
  rétrocompatible : un champ optionnel ajouté avec `.default()`, une méthode
  de port ajoutée sans casser les implémentations existantes, une entrée CI
  non bloquante ajoutée. Le diff reste dans le périmètre d'une seule
  responsabilité.
- **`high`** — au moins une des situations suivantes : suppression/
  renommage d'un champ sérialisé sans migration documentée (l'aggravation du
  § 2) ; la surface **Secrets**, **Authentification & autorisations**,
  **Déploiement** ou **Concurrence** est touchée de quelque façon que ce
  soit (ces quatre-là n'ont pas de palier `medium` — leur seul fait d'être
  touchées suffit, vu le coût d'un incident) ; un contrat module-API
  modifié de façon non rétrocompatible ;
  un calcul de scoring déjà couvert par un test golden modifié sans que ce
  test golden le soit aussi. Le cas de plusieurs surfaces touchées
  simultanément n'est pas un déclencheur séparé : il retombe sur la règle
  unique ci-dessus — si l'une des surfaces touchées est individuellement
  `high`, l'ensemble l'est ; si toutes ne sont que `medium`, l'ensemble
  reste `medium`, jamais moyenné ni aggravé par leur seul nombre.

### 4. Documenter les mitigations attendues

Pour le niveau retenu, énoncer ce qu'il impose (voir § Conséquences par
niveau) — jamais juste le mot `low`/`medium`/`high` seul : un niveau sans
conséquence énoncée n'aide aucun appelant à agir dessus.

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
  (`doc/technical/automation-plan.md` §5).
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

## Sortie structurée

```markdown
## Analyse de risque — <issue/PR référencée>

**Niveau : `low` | `medium` | `high`**

### Preuves
- <chemin> (<ajout|modification|suppression>) → <surface, ou "aucune surface">
...

### Aggravations de compatibilité
<« Aucune » si non pertinent, ou la liste des champs ajoutés sans `.default()`
/ supprimés-renommés sans entrée migrations.md>

### Mitigations requises
- Tests : <ce que `test-strategy` doit couvrir en plus, ou "standard suffit">
- Revue : <normale | recommandée | obligatoire (+ security/architecture review si applicable)>
- Merge : <éligible automation:enabled | manuel toujours>

### Articulation avec issue-to-spec
<catégorie Faible/Élevé de la spec si connue, et si elle est cohérente avec
le niveau retenu ici — jamais une réécriture de cette catégorie>
```

Si § Préconditions a déclenché un refus (ni diff ni spec exploitable), la
sortie est ce refus, jamais une analyse partielle qui masquerait les
surfaces qui n'ont pas pu être vérifiées.

## Sorties obligatoires

- La sortie structurée ci-dessus, ou un refus explicite nommant ce qui
  manque (§ Préconditions) — toujours l'un des deux, jamais un silence.
- Chaque surface listée en preuve, y compris "aucune surface" pour un
  fichier qui n'en touche aucune — jamais un fichier omis du diff analysé.
- Le niveau retenu est toujours le plus élevé des surfaces touchées, jamais
  une moyenne ou une majorité.
- La section "Articulation avec issue-to-spec" est présente même quand la
  spec ne porte pas encore de `## Catégorie de risque` (dans ce cas :
  "non renseignée dans la spec").

## Contrôles

Avant de renvoyer l'analyse : chaque fichier du diff (ou de `## Fichiers
impactés`) a été classé dans une surface ou explicitement "aucune surface" ;
le niveau retenu correspond bien à la surface la plus sévère notée en
preuve, pas à une autre ; toute aggravation de compatibilité détectée au
§ 2 a fait monter le niveau de la surface concernée ; les mitigations
énoncées correspondent au tableau § Conséquences par niveau, pas à une
formulation ad hoc. Une analyse qui échoue à l'un de ces contrôles n'est pas
prête à être renvoyée à l'appelant.

## Escalade

Per `doc/automation/skill-contract.md` §3, spécialisé à l'unique condition
d'arrêt possible pour ce skill (entrée ambiguë ou incomplète) : ni diff ni
spec avec fichiers impactés disponibles (§ Préconditions). N'ayant pas de
déclencheur GitHub propre, ce skill ne pose jamais lui-même
`automation:needs-human` — il énonce le refus et rend la main à l'appelant
(un humain, ou le chemin d'escalade de la skill appelante) plutôt que de
deviner un niveau pour continuer.

## Limites

- Ne bloque et ne merge jamais rien lui-même — il produit un niveau et des
  mitigations, c'est à l'appelant (`implement-task`, `pr-review`,
  `site-quality`) d'agir dessus une fois le câblage réel fait (hors scope de
  ce fichier).
- Ne recalcule et ne réécrit jamais la catégorie **Faible**/**Élevé**
  d'`issue-to-spec` sur une issue existante — voir § Articulation.
- N'invente jamais de surface au-delà des huit listées ; un chemin qui n'en
  touche aucune est `low` explicite, jamais reclassé par analogie.
- Ne moyenne jamais un niveau entre plusieurs surfaces — toujours le plus
  sévère.
- Ne pose ni ne retire aucun label GitHub — il n'a pas d'étape de claim,
  n'ayant pas de déclencheur propre (§ Préconditions).
