# P2-16: Migration appelée à chaque `getAll()`

## Fichier
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStorageMatchRepository.kt:12-17`

## Problème
```kotlin
override fun getAll(): List<Match> {
    migrateIfNeeded()  // ← appelé sur chaque read
    return localStorage.getItem(KEY)
        ?.let { scoreoJson.decodeFromString<List<Match>>(it) }
        ?: emptyList()
}
```

`migrateIfNeeded()` parse le JSON complet, vérifie si une migration est nécessaire, et re-sérialise même si rien n'a changé. Appelé sur chaque `getAll()` = chaque rafraîchissement d'écran, chaque `save()`, chaque `findById()`.

## Correction
```kotlin
class LocalStorageMatchRepository : MatchRepository {
    private var migrated = false

    override fun getAll(): List<Match> {
        if (!migrated) {
            migrateIfNeeded()
            migrated = true
        }
        return localStorage.getItem(KEY)
            ?.let { scoreoJson.decodeFromString<List<Match>>(it) }
            ?: emptyList()
    }
    // ...
}
```

Note : le cache "migrated" ne persiste que pour la session courante. Si un autre onglet modifie les données, la migration ne sera pas rejouée. C'est acceptable car la migration est idempotente (elle ne modifie que les entrées non-UUID).

## Effort
10 min.

## Tests (P3)
- Vérifier que `migrateIfNeeded()` n'est appelé qu'une fois
- Simuler des données non migrées → vérifier 1 seul appel de `generateId()`
