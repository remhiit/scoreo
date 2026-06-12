# P1-09: `isUuid()` rejette l'hexadécimal majuscule

## Fichier
- `src/commonMain/kotlin/com/scoreo/infrastructure/MatchMigration.kt:62-63`

## Problème
```kotlin
internal fun isUuid(str: String): Boolean =
    Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}").matches(str)
```

La regex utilise `[0-9a-f]` qui ne matche que les lettres hex minuscules. Un UUID contenant des lettres majuscules (`550E8400-E29B-41D4-A716-446655440000`) serait identifié comme non-UUID → son ID serait régénéré par la migration, cassant les références à ce match.

## Correction
```kotlin
internal fun isUuid(str: String): Boolean =
    Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", RegexOption.IGNORE_CASE)
        .matches(str)
```

Ou alternative : normaliser en lowercase avant le match :
```kotlin
isUuid(str.lowercase())
```

## Effort
2 min.

## Tests
- `MatchMigrationTest` — ajouter un test avec `"550E8400-E29B-41D4-A716-446655440000"` (majuscules)
- Vérifier que `isUuid` retourne `true`
