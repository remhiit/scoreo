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
| `max_complexity` | Bande de complexité maximale pour laquelle ce modèle est jugé pertinent — informatif, consommé par le futur routeur (#404) |
| `fallback` | Optionnel — identifiant d'un autre modèle de ce catalogue, utilisé en secours quand celui-ci est désactivé. Une chaîne de fallback circulaire est refusée à la validation |

## `.automation/routing-policy.yml`

Une politique par routine (`implement-task`, `pr-review`,
`address-feedback` — doit couvrir exactement les routines de
`.automation/routines.yml`) :

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
model-a`, plutôt que de laisser le futur routeur (#404) boucler à
l'exécution.
