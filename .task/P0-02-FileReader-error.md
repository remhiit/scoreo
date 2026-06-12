# P0-02: `FileReader` pas de gestion d'erreur

## Fichier
- `src/jsMain/kotlin/com/scoreo/ui/import/ImportScreen.kt:29-36`

## Problème
1. `reader.onerror` et `reader.onabort` jamais définis → fichier illisible = UI freeze
2. `(event.target as HTMLInputElement)` → `ClassCastException` si event.target n'est pas l'input
3. Impossible de re-sélectionner le même fichier (valeur de l'input jamais reset)

## Correction

```kotlin
onChange { event ->
    val input = (event.target as? HTMLInputElement) ?: return@onChange
    val file = input.files?.item(0) ?: return@onChange
    val reader = FileReader()
    reader.onload = { _ ->
        (reader.result as? String)?.let { handler.handle(ImportIntent.FileLoaded(it)) }
    }
    reader.onerror = { _ ->
        handler.handle(ImportIntent.FileLoaded("")) // ou nouvel intent d'erreur
    }
    reader.onabort = { _ ->
        handler.handle(ImportIntent.FileLoaded(""))
    }
    reader.readAsText(file)
    input.value = "" // permet re-select du même fichier
}
```

Note: Si `ImportIntent.FileLoaded("")` n'est pas prévu pour gérer les erreurs, il faudrait ajouter un `ImportIntent.FileError` dans `ImportHandler`.

## Effort
15 min. Créer `FileError` intent si nécessaire.

## Dépendance
Vérifier `ImportHandler.handle()` et `ImportState` pour l'intent d'erreur — peut nécessiter une légère extension.
