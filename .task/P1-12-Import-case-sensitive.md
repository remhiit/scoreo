# P1-12: Import — Match par nom case-sensitive

## Fichier
- `src/commonMain/kotlin/com/scoreo/application/ImportMatchesUseCase.kt:183-184,192-193`

## Problème
```kotlin
// L184: resolveGameType
val existing = gameTypeRepository.getAll().find { it.name == name }

// L193: resolvePlayer
val existing = existingPlayers.find { it.name == name }
```

Si le JSON importé a `"alice"` mais le joueur existant est `"Alice"`, un doublon est créé (et idem pour les GameTypes).

## Correction
```kotlin
// L184
val existing = gameTypeRepository.getAll().find { it.name.equals(name, ignoreCase = true) }

// L193
val existing = existingPlayers.find { it.name.equals(name, ignoreCase = true) }
```

## Effort
5 min.

## Tests
- Importer un JSON avec `"alice"` alors que `"Alice"` existe déjà → pas de doublon
- Importer un JSON avec `"1000 sabords"` alors que `"1000 Sabords"` existe déjà → pas de doublon
