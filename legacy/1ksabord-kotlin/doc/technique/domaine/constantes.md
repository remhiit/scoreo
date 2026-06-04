# Constantes — Constantes.kt

Fichier : `src/commonMain/kotlin/fr/ksabord/domaine/Constantes.kt`

Contient toutes les constantes du domaine. Pas de logique, que des
déclarations.

## Couleurs des joueurs

```kotlin
val COULEURS_JOUEURS = arrayOf("#e74c3c", "#3498db", "#2ecc71", ...)
```

8 couleurs correspondant aux variables CSS `--c0` à `--c7`.

## Types de dés

```kotlin
data class TypeDé(val id: String, val icône: String, val label: String)
```

6 types : crânes, diamants, or, singes, perroquets, sabres.

## Cartes

```kotlin
data class DéfCarte(val id: String, val label: String)
```

10 cartes :

| ID | Label |
|---|---|
| `none` | Aucune |
| `captain` | Capitaine (×2) |
| `diamond` | Diamant +1 |
| `gold` | Or +1 |
| `animals` | Animaux |
| `witch` | Sorcière |
| `sea2` | Combat naval (2 sabres) |
| `sea3` | Combat naval (3 sabres) |
| `sea4` | Combat naval (4 sabres) |
| `skull1` | Tête de mort +1 |
| `skull2` | Tête de mort +2 |

## Bonus de séries

```kotlin
val BONUS_SÉRIES = mapOf(3 to 100, 4 to 200, 5 to 500, 6 to 1000,
                          7 to 2000, 8 to 4000, 9 to 4000)
```

-
