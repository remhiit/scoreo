# P1-11: Import — `WinCondition.valueOf()` non-safe

## Fichier
- `src/commonMain/kotlin/com/scoreo/application/ImportMatchesUseCase.kt:186`

## Problème
```kotlin
val wc = winCondition?.let { WinCondition.valueOf(it) } ?: WinCondition.MANUAL
```

Si le JSON importé contient `"highest_score"` (lowercase), `"HIGH_SCORE"`, `"high score"` ou toute variante, `valueOf()` lance `IllegalArgumentException`. Catché par `runCatching` → message opaque.

## Correction
```kotlin
val wc = winCondition?.let { wcStr ->
    WinCondition.entries.find { it.name.equals(wcStr, ignoreCase = true) }
        ?: error("Unknown winCondition '$wcStr'. Valid values: ${WinCondition.entries.joinToString { it.name }}")
} ?: WinCondition.MANUAL
```

## Effort
5 min.

## Tests
- Ajouter un test d'import avec `"highest_score"` (lowercase dans le JSON)
- Ajouter un test d'import avec `"INVALID"` → doit échouer avec message clair
