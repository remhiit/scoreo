# Modèles — modeles.ts

Fichier : `src/domain/modeles.ts`

Définit les objets valeur et la hiérarchie des événements.

## EvenementCoup (event sourcing)

```ts
type EvenementCoup = CoupCalculateur | CoupManuel | CoupIleCranes

// Une union discriminée sur `type`, là où le Kotlin avait une `sealed class` :
// la méthode abstraite devient une fonction libre.
function contributionPour(coup: EvenementCoup, nom: string): number
```

Trois sous-classes :

| Type | Discriminant `type` | Description |
|---|---|---|
| `CoupCalculateur` | `"calculateur"` | Tour calculé via la calculatrice (dés + carte) |
| `CoupManuel` | `"manuel"` | Score saisi manuellement avec multiplicateur |
| `CoupIleCranes` | `"ile"` | Pénalité Île de la Tête de Mort infligée aux adversaires |

### CoupCalculateur

Stocke la carte, les dés, le score calculé, les details, le statut
buste/île, la pénalité et le flag pirate magique.

### CoupManuel

Stocke le score entré, le multiplicateur (1 ou 2) et le score final.

### CoupIleCranes

Stocke le nombre de crânes et la pénalité par adversaire (négative).

## ResultatScore

```ts
interface ResultatScore {
  readonly score: number
  readonly details: string
  readonly bust: boolean
  readonly ileCranes: boolean
  readonly nombreCranes: number
  readonly penaliteIle: number
  readonly magiquePirate: boolean
}
```

Retourné par `calculerScore()`. Non sérialisé directement (utilisé
uniquement en mémoire ; c'est `CoupCalculateur` qui est persisté).

## PartieTerminee

```ts
interface PartieTerminee {
  readonly uuid: string
  readonly horodatage: number
  readonly classement: readonly ResultatJoueur[]
  readonly nombreManches: number
  readonly magiquePirate: boolean
  readonly coups: readonly EvenementCoup[]
}
```

Structure archivée dans l'historique (20 dernières parties).

-
