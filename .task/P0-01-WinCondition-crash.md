# P0-01: `WinCondition.valueOf()` crash sur `<select>`

## Fichiers
- `src/jsMain/kotlin/com/scoreo/ui/home/HomeScreen.kt:208-209`
- `src/jsMain/kotlin/com/scoreo/ui/gametype/GameTypeScreen.kt:37`

## Problème
```kotlin
// HomeScreen.kt:208-209
val wc = WinCondition.valueOf(event.value ?: WinCondition.HIGHEST_SCORE.name)

// GameTypeScreen.kt:37
val wc = WinCondition.valueOf(event.value ?: WinCondition.HIGHEST_SCORE.name)
```

`WinCondition.valueOf()` jette `IllegalArgumentException` si `event.value` ne correspond à aucun nom d'enum. Le `?:` ne couvre QUE `null`, pas les valeurs invalides (manipulation DOM, stale select).

## Correction
```kotlin
val wc = WinCondition.entries.find { it.name == event.value }
    ?: WinCondition.HIGHEST_SCORE
```

## Effort
5 min par fichier. 2 occurences identiques.

## Test
Aucun test de rendu n'existe pour ces screens. Fix trivial, vérification manuelle suffisante.
