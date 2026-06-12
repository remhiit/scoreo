# P0-03: `save()` pas idempotent dans les 3 repos LocalStorage

## Fichiers
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStoragePlayerRepository.kt:17-19`
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStorageGameTypeRepository.kt:16-18`
- `src/jsMain/kotlin/com/scoreo/infrastructure/LocalStorageMatchRepository.kt:19-21`

## Problème
Chaque `save()` appelle `getAll()` puis `it.add(player)`. Si `save()` est appelé 2x avec le même ID, un doublon est créé. Aucun update-or-insert.

## Correction

Pattern identique pour les 3 repos :

```kotlin
// LocalStoragePlayerRepository.kt
override fun save(player: Player) {
    val updated = getAll(includeInactive = true).toMutableList()
    val idx = updated.indexOfFirst { it.id == player.id }
    if (idx >= 0) updated[idx] = player else updated.add(player)
    localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
}
```

```kotlin
// LocalStorageGameTypeRepository.kt
override fun save(gameType: GameType) {
    val updated = getAll().toMutableList()
    val idx = updated.indexOfFirst { it.id == gameType.id }
    if (idx >= 0) updated[idx] = gameType else updated.add(gameType)
    localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
}
```

```kotlin
// LocalStorageMatchRepository.kt
override fun save(match: Match) {
    val updated = getAll().toMutableList()
    val idx = updated.indexOfFirst { it.id == match.id }
    if (idx >= 0) updated[idx] = match else updated.add(match)
    localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
}
```

## Effort
15 min (3 fichiers, pattern identique).
