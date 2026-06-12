# P0-04: Aucun error handling JSON corrompu dans les 3 repos

## Fichiers
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStoragePlayerRepository.kt:12-15`
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStorageGameTypeRepository.kt:11-14`
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStorageMatchRepository.kt:14-16`

## Problème
`scoreoJson.decodeFromString<List<T>>(it)` lance `SerializationException` si le localStorage est corrompu (écriture partielle, édition manuelle, migration qui échoue). Aucun catch → écran blanc.

## Correction

Pattern identique pour les 3 repos `getAll()` :

```kotlin
// LocalStoragePlayerRepository.kt
override fun getAll(includeInactive: Boolean): List<Player> =
    localStorage.getItem(KEY)
        ?.let { raw ->
            runCatching { scoreoJson.decodeFromString<List<Player>>(raw) }
                .getOrDefault(emptyList())
        }
        ?.let { if (includeInactive) it else it.filter { p -> p.active } }
        ?: emptyList()
```

Même pattern pour `GameTypeRepository` et `MatchRepository` (sans le filtre `includeInactive`).

Optionnel : logger l'erreur via `console.warn` pour debug.

## Effort
10 min (3 fichiers, pattern identique).
