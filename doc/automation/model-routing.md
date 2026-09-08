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

Aucune routine ne consomme aujourd'hui ce contrat pour router réellement une
décision — même statut « support uniquement » que `TaskContext` (#401) et
`ComplexityAssessment` (#402) tant qu'ils ne sont pas câblés. Aucun appel
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
