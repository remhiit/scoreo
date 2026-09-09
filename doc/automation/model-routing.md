# Contrat de routage multi-modèles

Documente le contrat versionné consommé par le futur skill coordinateur
(#430) pour choisir un modèle de sous-agent par routine × bande de
complexité : `.automation/model-catalog.yml` (catalogue des modèles
disponibles) et `.automation/routing-policy.yml` (politique de routage).
Issue #400, dans le prolongement de l'arbitrage d'architecture #423 — voir
`doc/technical/automation-plan.md` § « Routage par sous-agent » pour le
contexte complet (pourquoi router, option retenue, périmètre de l'épic).

Les deux fichiers sont validés en CI par le job `automation-config` de
`ci.yml`, via `scripts/automation-dispatch.mjs` (`node
scripts/automation-dispatch.mjs`). Leur contrat est aussi documenté en JSON
Schema, à titre de référence lisible — la validation réelle reste le
validateur écrit à la main dans `scripts/automation-dispatch.mjs` (même
précédent que `schemas/automation/routines.schema.json`) :

- `schemas/automation/model-catalog.schema.json`
- `schemas/automation/routing-policy.schema.json`

## Ce que ce contrat n'est pas (encore)

Le skill du coordinateur consomme désormais ce contrat pour calculer et
journaliser une décision de routage à chaque run (§ « Mode dry-run »
ci-dessous, issue #406) — mais jamais encore pour router réellement un
sous-agent sur le modèle choisi : la matrice d'activation (§ « Matrice
d'activation » ci-dessous, issue #476) résout `observe` ou `apply` pour
chaque triplet routine × bande × risque, et tant qu'elle résout `observe`
(le cas aujourd'hui, pour tous les triplets), chaque `Agent` continue de
partir sans override `model`. Router une décision réelle reste le périmètre
de #407. Aucun appel
fournisseur n'est fait ici : `.automation/model-catalog.yml` décrit d'abord
les modèles de sous-agent disponibles dans Claude Code (déclarables en
frontmatter `model:` d'une définition d'agent, `.claude/agents/<nom>.md`, ou
via le paramètre `model` de l'outil Agent), sans champ d'endpoint, de secret
ni d'authentification.

## `.automation/model-catalog.yml`

Un modèle par entrée, indexé par un identifiant de catalogue stable :

| Champ | Rôle |
|---|---|
| `provider` | Fournisseur, chaîne libre en kebab-case (`anthropic` aujourd'hui) — volontairement pas un `enum` fermé, pour rester ouvert au multi-provider sans changer le schéma |
| `model` | Identifiant du modèle côté fournisseur (ex: `claude-sonnet-5`) |
| `agent_alias` | Optionnel — valeur utilisable telle quelle dans le frontmatter `model:` d'un agent Claude Code ou le paramètre `model` de l'outil Agent (`sonnet`/`opus`/`haiku`/`fable`) |
| `enabled` | Un modèle désactivé ne peut être candidat d'aucune politique |
| `capabilities.tools` / `.structured_output` / `.long_context` | Confrontées à `required_capabilities` d'une politique de routage |
| `quality_score` (0-100) | Confronté au `min_score` d'une bande de complexité |
| `cost_tier` / `latency_tier` | Paliers relatifs (`low`/`medium`/`high` et `fast`/`medium`/`slow`) |
| `max_risk` | Niveau de risque maximal (échelle `change-risk` : `low`/`medium`/`high`) que ce modèle peut couvrir — confronté à `risk_overrides` |
| `max_complexity` | Bande de complexité maximale pour laquelle ce modèle est jugé pertinent — filtre dur appliqué par `scripts/model-router.mjs` (#404, § Algorithme du routeur) : un candidat sous la bande cible n'est jamais éligible |
| `fallback` | Optionnel — identifiant d'un autre modèle de ce catalogue, utilisé en secours quand celui-ci est désactivé. Une chaîne de fallback circulaire est refusée à la validation |

## `.automation/routing-policy.yml`

Une politique par routine dispatchée (`implement-task`, `pr-review`,
`address-feedback` — chaque routine de `.automation/routines.yml` doit en
référencer une via son champ `routing_policy`, vérifié par
`scripts/automation-dispatch.mjs#validateRoutingPolicyCoverage`). Une entrée
supplémentaire, non référencée par aucune routine, reste valide : c'est le
cas de `classification` (#403, sous-agent classifieur de complexité,
`.claude/agents/complexity-classifier.md`), consommé directement par un
sous-agent plutôt que par le dispatcher de labels — la vérification ne porte
que sur la direction « chaque routine référence une politique existante »,
jamais l'inverse. Chaque politique porte :

- `required_capabilities` : capacités indispensables pour cette routine. Un
  candidat qui n'en couvre pas une est refusé à la validation.
- `bands` : une entrée pour **chacune des quatre bandes** de
  `.automation/complexity-thresholds.yml` (`trivial`/`standard`/`complex`/
  `very-complex`) — une bande manquante est un trou de couverture refusé à
  la validation, jamais une valeur par défaut silencieuse. Chaque bande
  porte :
  - `candidates` : modèles candidats pondérés (`weight`, poids de décision).
    La somme des poids d'une bande doit être exactement 100, jamais négative.
  - `min_score` : score de qualité minimal (`quality_score` du catalogue)
    qu'un candidat de cette bande doit atteindre.
  - `fallback` : modèle de secours si tous les candidats de la bande sont
    désactivés.
- `risk_overrides` (optionnel) : force un modèle quel que soit `bands` quand
  le niveau de risque (`change-risk`, #387, support uniquement pour
  l'instant) atteint le niveau donné (`low`/`medium`/`high`). Le modèle
  retenu doit couvrir ce niveau via son `max_risk` de catalogue.

Le dispatcher (ou, une fois câblé, le skill coordinateur) résout une
politique **sans connaître un nom de fournisseur** : il ne lit que
`provider`/`model`/`agent_alias` en bout de chaîne, jamais un identifiant de
fournisseur codé en dur dans la logique de résolution.

## Règles de compatibilité et valeurs interdites

Validées en CI, avec un message nommant les identifiants en cause :

| Cas | Comportement |
|---|---|
| Fichier absent (`.automation/model-catalog.yml` ou `routing-policy.yml`) | Erreur explicite (« fichier introuvable »), jamais une exception de parsing |
| Candidat ou `fallback` absent du catalogue | Erreur nommant l'identifiant candidat et la routine/bande |
| Candidat ou `fallback` référençant un modèle désactivé (`enabled: false`) | Erreur nommant le modèle |
| Chaîne de fallback circulaire dans le catalogue (`models.*.fallback`) | Détectée et refusée, cycle affiché (ex: `a -> b -> a`) |
| Routine de `.automation/routines.yml` sans `routing_policy`, ou dont le `routing_policy` ne résout aucune entrée de `routing-policy.yml` | Erreur explicite, jamais une valeur par défaut silencieuse |
| Poids de candidats d'une bande ne totalisant pas 100, ou négatifs | Refus à la validation |
| Candidat sous le `min_score` de sa bande | Refus à la validation |
| Candidat ne couvrant pas une capacité requise (`required_capabilities`) | Refus à la validation |
| `risk_overrides` pointant un modèle dont le `max_risk` est sous le niveau de risque requis | Refus à la validation |

## Exemple : étendre le catalogue à un fournisseur compatible OpenAI et à un modèle local

Le schéma décrit ci-dessus n'est pas spécifique à Anthropic : `provider` est
une chaîne libre, et `agent_alias`/`fallback` restent optionnels. Voici, à
titre d'illustration (non versionné dans `.automation/model-catalog.yml`
tant qu'aucun appelant n'existe côté fournisseur — voir § « Ce que ce
contrat n'est pas encore »), comment le même schéma décrirait un modèle
compatible OpenAI et un modèle local sans y changer un seul champ :

```yaml
version: 1
models:
  # ... modèles de sous-agent Claude Code existants (haiku-4-5, sonnet-5, opus-5) ...
  gpt-oss-mini:
    provider: openai-compatible
    model: gpt-oss-mini-2025-10
    enabled: true
    capabilities:
      tools: true
      structured_output: true
      long_context: false
    quality_score: 60
    cost_tier: low
    latency_tier: fast
    max_risk: medium
    max_complexity: standard
    fallback: sonnet-5
  llama-local:
    provider: local
    model: llama-4-scout-q4
    enabled: false
    capabilities:
      tools: false
      structured_output: false
      long_context: false
    quality_score: 35
    cost_tier: low
    latency_tier: medium
    max_risk: low
    max_complexity: trivial
```

`gpt-oss-mini` illustre aussi le fallback inter-provider : à défaut, la
résolution retombe sur `sonnet-5` (un modèle de sous-agent Claude Code),
sans que le schéma en soit changé — le champ `fallback` référence n'importe
quel identifiant du même catalogue, indépendamment de son `provider`. Un
appel réel à un fournisseur externe (endpoint, secret, adapter) reste hors
scope de ce contrat — voir `doc/technical/automation-plan.md` § « Routage
par sous-agent », option B.

## Algorithme du routeur (`scripts/model-router.mjs`, issue #404)

Fonction pure `routeModel` : mêmes entrées (y compris les versions de
catalogue/politique) → même décision, zéro appel réseau, zéro branchement
spécifique à un fournisseur — le code ne lit jamais `provider === "..."`,
seulement les champs génériques du contrat ci-dessus. Elle prend en entrée
un `TaskContext` (#401, uniquement pour tracer l'entité d'origine dans la
décision), un `ComplexityAssessment` (#402), un `RiskAssessment` (produit
par le skill `change-risk`, #387 — support uniquement pour l'instant, donc
réduit ici à `{ level: 'low'|'medium'|'high' }`), la définition de la
routine (`.automation/routines.yml`) et le catalogue/politique ci-dessus.
Elle ne pose et ne retire elle-même aucun label GitHub : c'est à son
appelant (le futur skill coordinateur, #430) de traduire `status:
"no-candidate"` en `automation:needs-human`.

### Ordre de résolution — sécurité avant score

Les contraintes de risque et de complexité sont des **filtres durs**,
résolus avant tout calcul de score, jamais un critère qu'un score élevé
pourrait compenser :

1. **Bande effective.** La bande de `ComplexityAssessment.level` est
   utilisée telle quelle, sauf si `confidence === 'low'` : elle est alors
   majorée d'un cran (jamais au-delà de `very-complex`) — une évaluation peu
   fiable ne doit jamais mener à sous-router.
2. **`risk_override` applicable.** Résolu par seuil, pas par égalité
   stricte : le palier retenu est le plus sévère de ceux que le risque réel
   atteint (« atteint » = risque réel ≥ palier). Un override désigne un
   candidat forcé, mais qui reste soumis à l'étape 3 comme tout autre
   candidat — un override ne contourne jamais un filtre de sécurité.
3. **Filtre unique, appliqué identiquement à tout candidat** (override
   manuel, override de risque, candidat de bande, fallback de bande,
   fallback de catalogue — un seul chemin de code, jamais une variante
   allégée pour les fallbacks, ce qui garantit qu'« un fallback conserve les
   mêmes contraintes de sécurité que le choix initial ») :
   - modèle présent dans le catalogue et `enabled: true` ;
   - chaque capacité de `required_capabilities` couverte ;
   - `max_complexity` du modèle ≥ bande effective ;
   - `max_risk` du modèle ≥ niveau de risque réel — **jamais contournable
     pour réduire le coût**, y compris pour un override manuel ou de
     risque ;
   - `quality_score` du modèle ≥ `min_score` de la bande ;
   - contraintes de fournisseur (`allowedProviders`/`deniedProviders`),
     de budget (`maxCostTier`) et de latence (`maxLatencyTier`), quand la
     routine en déclare ;
   - fournisseur non signalé indisponible (`providerStatus`) pour ce run ;
   - identifiant non explicitement exclu par l'appelant
     (`excludedModelIds` — ex: un échec transitoire déjà tenté dans ce même
     run).

   Un candidat qui échoue à l'un de ces filtres porte toujours au moins une
   raison d'exclusion lisible — jamais un rejet silencieux.

### Score pondéré

Une fois filtrés, les candidats d'une même bande sont classés par un score
0–1 combinant, avec les poids par défaut de
`DEFAULT_SCORE_WEIGHTS` (somme 100) :

| Dimension | Poids par défaut | Calcul |
|---|---|---|
| `policyPreference` | 30 | Poids déclaré du candidat dans la bande (`routing-policy.yml#candidates.*.weight` / 100) |
| `quality` | 25 | `quality_score` du catalogue / 100 |
| `contextFit` | 15 | 1 − distance normalisée entre `max_complexity` du modèle et la bande effective (pénalise la sur-qualification, jamais la sous-qualification déjà exclue au filtrage) |
| `cost` | 10 | `cost_tier` inversé (`low`→1, `medium`→0.5, `high`→0) |
| `latency` | 10 | `latency_tier` inversé (`fast`→1, `medium`→0.5, `slow`→0) |
| `providerAvailability` | 5 | `providerStatus[provider].uptime` si fourni, sinon 1 (disponibilité pleine par défaut) |
| `historicalPerformance` | 5 | `historicalMetrics[modèle].successRate` si connu |

**Métriques historiques absentes** (cas normal tant qu'aucun historique
n'est encore collecté) : la dimension `historicalPerformance` est retirée
pour ce candidat et les poids restants sont renormalisés à 100 — jamais
traitée comme un score nul, qui pénaliserait injustement un candidat pour
une donnée simplement indisponible. Le même principe s'applique à
`policyPreference` pour un candidat de fallback (qui ne porte pas de poids
de bande). La décision consigne cette neutralisation dans `limits`.

**Égalité de score** (départage déterministe, pour que la reproductibilité
tienne) : le candidat retenu est, dans l'ordre, celui du score le plus
élevé, puis du `quality_score` de catalogue le plus élevé, puis de
l'identifiant de catalogue le plus petit par ordre alphabétique.

Un override manuel ou de risque, une fois jugé éligible, est retenu
directement — il n'est jamais mis en concurrence par score avec les
candidats de bande.

### Chaîne de fallback

La séquence complète évaluée, dans l'ordre de précédence, est : override
manuel → override de risque → candidats de bande (classés par score une
fois éligibles) → fallback de bande → chaîne de fallback de catalogue
(`model-catalog.yml#fallback`, suivie de proche en proche, dédupliquée).
Le premier candidat éligible de cette séquence est sélectionné ; tous les
autres candidats éligibles qui le suivent forment `fallbacks`, la liste
ordonnée que l'appelant peut réessayer si le modèle sélectionné échoue en
cours de run (fournisseur indisponible, erreur transitoire, budget
dépassé — l'appelant relance alors `routeModel` avec ce modèle ajouté à
`excludedModelIds`, jamais un état conservé côté routeur).

**Absence de candidat** — aucun candidat éligible sur toute la séquence, y
compris après épuisement de la chaîne de fallback : `status:
"no-candidate"`, `selectedModel: null`, `fallbacks: []`. Les deux cas
(aucun candidat dès le départ, ou chaîne épuisée) produisent exactement la
même forme de décision, jamais un choix par défaut. C'est ce que
l'appelant doit traduire en `automation:needs-human`.

### Décision journalisée

Le contrat de sortie est documenté dans
`schemas/automation/routing-decision.schema.json` et publié dans le
journal de routine (`scripts/automation-log.mjs`, ligne « Routage ») sous
la même convention que `TaskContext`/`ComplexityAssessment` : optionnel,
absent tant qu'aucun appelant ne le fournit, jamais un blocage du journal
lui-même si l'artefact est manquant ou invalide.

## Mode dry-run (`scripts/routing-dry-run.mjs`, issue #406)

Câble la chaîne ci-dessus — `TaskContext` → `ComplexityAssessment` →
fallback LLM → `RoutingDecision` → matrice d'activation (§ ci-dessous,
issue #476) — à l'intérieur du skill du coordinateur
(`.claude/skills/coordinator/SKILL.md`) : chaque `Agent` que ce skill lance
ne part avec un override `model` que si la matrice d'activation résout
`apply` pour le triplet (routine × bande × risque) de ce run — `observe`
tant qu'elle ne le fait pas, le cas par défaut, y compris quand la section
`activation` est simplement absente. Fonctions pures, zéro effet de bord,
zéro appel réseau — même précédent que le reste de ce contrat.

### `extractRiskLevel(issueBody)`

Lit la section `## Catégorie de risque` du corps d'une issue — même format
que `issue-to-spec/SKILL.md` produit, `**Faible**` ou `**Élevé**` en tête de
section — et renvoie `{ level: 'low' | 'high', source }`. Section absente,
vide, ou portant un libellé qui n'est ni l'un ni l'autre → `null`, jamais un
niveau deviné : un appelant ne doit jamais traiter `null` comme `'low'` par
défaut.

### `resolveRoutingDryRun(...)`

```
resolveRoutingDryRun({
  taskContext,     // TaskContext (#401)
  issueBody,       // corps complet, non tronqué — pas TaskContext.entity.bodyExcerpt
  labels,          // TaskContext.entity.labels, passé séparément (même convention que shouldRunLlmFallback)
  routines,        // .automation/routines.yml chargé
  routingPolicy,   // .automation/routing-policy.yml chargé
  modelCatalog,    // .automation/model-catalog.yml chargé
  llmResponse,     // optionnel — réponse déjà obtenue du sous-agent classifieur
})
// → { complexity, routing, applied, escalation, missing, limits }
```

Enchaîne `assessComplexity` → (`shouldRunLlmFallback` puis
`consolidateComplexity`, uniquement quand `llmResponse` est fourni) →
`routeModel`, sans jamais lancer elle-même de sous-agent — c'est à
l'appelant de fournir `llmResponse` s'il en a déjà une, jamais à cette
fonction d'aller la chercher.

- **Entrée amont manquante.** `taskContext` absent, ou `extractRiskLevel`
  renvoyant `null` : `routeModel` n'est jamais appelé, `missing` nomme
  l'entrée manquante (`"taskContext"`/`"riskLevel"`), `complexity`/`routing`
  restent `null`.
- **Fallback LLM.** Une réponse valide (`validateLlmComplexityResponse`) est
  consolidée dans la décision ; une réponse invalide, ou l'absence de
  réponse alors que `shouldRunLlmFallback` en aurait voulu une, laisse la
  complexité heuristique inchangée et le dit dans `limits`.
- **Configuration invalide.** Une version de catalogue/politique inattendue,
  une politique absente pour la routine, ou une bande absente font échouer
  `routeModel` avec son propre message — jamais intercepté, jamais traduit
  en décision partielle.
- **`status: 'no-candidate'`** produit systématiquement
  `escalation: 'automation:needs-human'`, jamais un modèle par défaut.
- **`applied`** reflète le mode résolu par la matrice d'activation (§
  « Matrice d'activation » ci-dessous, issue #476) pour ce triplet routine ×
  bande × risque : `true` uniquement si `resolveActivation` résout `apply`,
  `false` tant qu'elle résout `observe` — le cas par défaut d'un triplet non
  couvert ou d'une section `activation` absente, jamais un `false` implicite
  non justifié (`limits` le signale dans ce dernier cas, en plus de la
  `reason` que `resolveActivation` renvoie elle-même). Le résultat porte
  aussi ce détail complet sous le champ `activation` (`{ mode, reason }`).

### Décision journalisée (dry-run)

`coordinator/SKILL.md` § « Routage (dry-run, #406) » appelle cette fonction
une fois par run et journalise le résultat sur l'**issue**
(`scripts/automation-log.mjs#upsertAutomationLog`, routine
`coordinator-implement`) — une relance sur la même issue met à jour ce même
commentaire via son marqueur, jamais un second. Au-delà des lignes
`complexity`/`routing` déjà décrites plus haut, le journal publie les trois
versions de configuration lues (`TASK_CONTEXT_VERSION`, la version de
politique et de catalogue, ces deux dernières déjà portées par
`RoutingDecision.input`), le mode d'activation résolu et sa raison (§
« Matrice d'activation » ci-dessous), et une mention explicite de
non-application — champs optionnels `taskContextVersion`/`routingApplied`/
`activation` de `renderAutomationLog`/`upsertAutomationLog`, comme
`metrics`/`findings` avant eux exercés pour l'instant par leurs seuls tests
unitaires, aucun workflow ne les alimentant encore.

Ce journal est ouvert avec `status: 'running'` et ne le reste pas jusqu'à la
fin du run : `coordinator/SKILL.md` § « Converged » et § Escalade referment
ce même commentaire (`upsertAutomationLog`, `onlyIfRunning: true`, même
`number`/routine) avec le résultat réel de la routine (`succeeded`/`failed`)
une fois le run convergé ou escaladé — même mécanisme `onlyIfRunning` que
`coordinator-log-sync.yml` utilise déjà pour clore le journal `coordinator-fix`
côté PR. Sans cette fermeture, le commentaire afficherait indéfiniment
`Statut : running`, ce qui viderait de son sens la comparaison « modèle
proposé / modèle réel / résultat de la routine » que ce journal existe pour
permettre. `upsertAutomationLog` réécrit le corps entier du commentaire à
chaque appel, sans jamais fusionner avec la version précédente : ces deux
fermetures re-transmettent donc les mêmes `complexity`/`routing`/
`taskContextVersion`/`routingApplied`/`activation` capturés à l'ouverture,
sous peine de faire disparaître les lignes
Complexité/Routage/Configuration/Activation/Modèle appliqué au moment
`succeeded`/`failed` — l'état que la comparaison ci-dessus regarde en
pratique le plus souvent. Ces deux mêmes fermetures sont aussi le seul point
d'appel où `runMetrics` (#477) est passé à `upsertAutomationLog` : ce champ
optionnel porte l'enregistrement structuré du run — `RunMetrics`, assemblé
par `scripts/run-metrics.mjs#buildRunMetrics` et validé par
`validateRunMetrics` — dont le contrat complet (champs, complétude,
rédaction des secrets) est documenté par
`doc/technical/automation-plan.md` § « Métriques » et par
`schemas/automation/run-metrics.schema.json`.

## Matrice d'activation (`scripts/routing-activation.mjs`, issue #476)

Remplace le drapeau global `dry_run` de #406 par une résolution fine, un
triplet à la fois plutôt que toutes les routines et toutes les bandes d'un
coup — l'activation réelle du routage doit commencer par les tâches
réversibles et peu risquées, puis s'étendre (doc/technical/automation-plan.md
§5 « Passage du dry-run à l'activation contrôlée »), jamais basculer d'un
seul geste.

```
resolveActivation(policy, { routine, band, riskLevel })
// → { mode: 'observe' | 'apply', reason }
```

`policy` est `.automation/routing-policy.yml` déjà chargé — `routine` doit
être une clé de `policy.routines` (le même espace de noms que la section
`activation`, jamais celui de `.automation/routines.yml`), `band` une des
quatre bandes de `.automation/complexity-thresholds.yml`. Fonction pure,
zéro effet de bord, zéro appel réseau.

```yaml
activation:
  implement-task:
    trivial: observe
    standard: observe
    complex: observe
    very-complex: observe
  # ... une entrée par politique de routines:, ci-dessus
```

Deux garde-fous non contournables par la déclaration de la matrice
elle-même :

- **Triplet non couvert.** Une routine absente de `activation`, ou une
  bande absente pour une routine présente, résout `observe` — l'absence de
  déclaration n'active jamais rien. Une section `activation` entièrement
  absente est traitée comme une matrice vide, donc `observe` partout ;
  `scripts/routing-dry-run.mjs#resolveRoutingDryRun` le signale alors dans
  `limits`, en plus de la `reason` que `resolveActivation` renvoie
  elle-même.
- **Risque `high`.** Résout toujours `observe`, quelle que soit la
  déclaration de la matrice pour ce triplet — même une déclaration `apply`
  explicite est écartée, et la `reason` le dit. L'activation sur risque
  élevé est traitée par sa propre tranche de #407, avec ses propres
  garde-fous, hors scope ici.

**Refus au démarrage.** Une matrice incohérente — mode inconnu (ni
`observe` ni `apply`), routine absente de `policy.routines`, bande absente
des quatre bandes de `.automation/complexity-thresholds.yml` — est refusée
avec une erreur nommant `.automation/routing-policy.yml` et la clé fautive
(`activation.<routine>.<bande>` ou `routines.<routine>`), jamais résolue
implicitement. Deux niveaux : le job CI `automation-config` refuse toute la
matrice à la validation de configuration
(`scripts/automation-dispatch.mjs#validateRoutingPolicy`, schéma
`schemas/automation/routing-policy.schema.json`) ; `resolveActivation`
revalide en défense en profondeur le seul triplet qu'on lui demande de
résoudre, avec le même message.

La matrice livrée par cette tranche (#476) déclare `observe` partout : elle
ne change le modèle d'aucune routine, elle ne fait que remplacer le
mécanisme qui en décidera. `scripts/routing-dry-run.mjs#resolveRoutingDryRun`
est le seul appelant prévu de `resolveActivation` — voir § « Mode dry-run »
ci-dessus pour comment son `applied` en dépend désormais.

## Exemple : chaîne de fallback circulaire refusée

```yaml
version: 1
models:
  model-a:
    # ... champs requis ...
    fallback: model-b
  model-b:
    # ... champs requis ...
    fallback: model-a
```

`scripts/automation-dispatch.mjs#validateModelCatalog` refuse cette
configuration avec `chaîne de fallback circulaire : model-a -> model-b ->
model-a`, plutôt que de laisser le routeur (`scripts/model-router.mjs`,
#404, § Algorithme du routeur) boucler à l'exécution.
