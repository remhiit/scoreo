# Modèles — Modeles.kt

Fichier : `src/commonMain/kotlin/fr/ksabord/domaine/Modeles.kt`

Définit les objets valeur et la hiérarchie des événements.

## ÉvénementCoup (event sourcing)

```kotlin
@Serializable
sealed class ÉvénementCoup {
    abstract val joueur: String
    abstract fun contributionPour(nom: String): Int
}
```

Trois sous-classes :

| Classe | `@SerialName` | Description |
|---|---|---|
| `CoupCalculateur` | `"calculateur"` | Tour calculé via la calculatrice (dés + carte) |
| `CoupManuel` | `"manuel"` | Score saisi manuellement avec multiplicateur |
| `CoupÎleCrânes` | `"ile"` | Pénalité Île de la Tête de Mort infligée aux adversaires |

### CoupCalculateur

Stocke la carte, les dés, le score calculé, les détails, le statut
buste/île, la pénalité et le flag pirate magique.

### CoupManuel

Stocke le score entré, le multiplicateur (1 ou 2) et le score final.

### CoupÎleCrânes

Stocke le nombre de crânes et la pénalité par adversaire (négative).

## RésultatScore

```kotlin
data class RésultatScore(
    val score: Int,
    val détails: String,
    val bust: Boolean,
    val îleCrânes: Boolean,
    val nombreCrânes: Int,
    val pénalitéÎle: Int,
    val magiquePirate: Boolean
)
```

Retourné par `calculerScore()`. Non sérialisé directement (utilisé
uniquement en mémoire ; c'est `CoupCalculateur` qui est persisté).

## PartieTerminée

```kotlin
@Serializable
data class PartieTerminée(
    val horodatage: Long,
    val classement: List<RésultatJoueur>,
    val nombreManches: Int,
    val magiquePirate: Boolean,
    val coups: List<ÉvénementCoup>
)
```

Structure archivée dans l'historique (20 dernières parties).

-
