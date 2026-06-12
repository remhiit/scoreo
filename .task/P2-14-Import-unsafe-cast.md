# P2-14: ImportScreen — unsafe cast + file input reset

## Fichier
- `src/jsMain/kotlin/com/scoreo/ui/import/ImportScreen.kt:29`

## Problème
```kotlin
val file = (event.target as HTMLInputElement).files?.item(0)
```

1. `as` (hard cast) → `ClassCastException` si event.target n'est pas l'input
2. Impossible de re-sélectionner le même fichier (valeur jamais reset)

## Correction
```kotlin
val input = (event.target as? HTMLInputElement) ?: return@onChange
val file = input.files?.item(0) ?: return@onChange
// ... utiliser file ...
input.value = "" // reset pour permettre re-select
```

## Effort
5 min.
