# Modèles — Modeles.kt

Fichier : `src/commonMain/kotlin/fr/ksabord/domaine/Modeles.kt`

Définit les objets valeur et la hiérarchie des événements.

## EvenementCoup (event sourcing)

```kotlin
@Serializable
sealed class EvenementCoup {
    abstract val joueur: String
    abstract fun contributionPour(nom: String): Int
}
```

Trois sous-classes :

| Classe | `@SerialName` | Description |
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

```kotlin
data class ResultatScore(
    val score: Int,
    val details: String,
    val bust: Boolean,
    val ileCranes: Boolean,
    val nombreCrânes: Int,
    val penaliteIle: Int,
    val magiquePirate: Boolean
)
```

Retourné par `calculerScore()`. Non sérialisé directement (utilisé
uniquement en mémoire ; c'est `CoupCalculateur` qui est persisté).

## PartieTerminee

```kotlin
@Serializable
data class PartieTerminee(
    val horodatage: Long,
    val classement: List<ResultatJoueur>,
    val nombreManches: Int,
    val magiquePirate: Boolean,
    val coups: List<EvenementCoup>
)
```

Structure archivée dans l'historique (20 dernières parties).

-
