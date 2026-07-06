# Fix: GIS oauth2 mapping manquant niveau `accounts`

## Cause

Le mapping Kotlin/JS external ne correspond pas à la hiérarchie réelle de l'API Google Identity Services.

**Hiérarchie GIS réelle :**
```
window.google.accounts.oauth2  ← 3 niveaux
```

**Hiérarchie codée (erronée) :**
```
window.google.oauth2  ← 2 niveaux ( `accounts` manquant)
```

Résultat : `google?.oauth2` est toujours `null` même quand GIS est chargé.

## Correctifs dans `GoogleIdentityService.kt`

### 1. Ajouter le niveau `accounts` dans les external interfaces

```kotlin
private external interface GoogleAccountsNamespace {
    val oauth2: GoogleOAuth2
}

private external interface GoogleAccounts {
    val accounts: GoogleAccountsNamespace
}
```

### 2. `typeofGoogleOAuth2()` — corriger le check

```kotlin
private fun typeofGoogleOAuth2(): String {
    val g = js("typeof google !== 'undefined' && google !== null && google.accounts !== undefined && google.accounts.oauth2 !== undefined")
    return if (g == true) "yes" else "no"
}
```

### 3. `withGis()` — accéder via `google?.accounts?.oauth2`

```kotlin
val g = google?.accounts?.oauth2
```

Et dans le log du premier échec :
```kotlin
if (retries == 10) {
    val hasGoogle = js("typeof google") as? String
    val hasAccounts = js("typeof google !== 'undefined' && google !== null && google.accounts !== undefined")
    c.log("[GoogleAuthService] GIS not ready — typeof google:", hasGoogle, "google.accounts exists:", hasAccounts)
}
```

### 4. `logout()` — corriger l'accès

```kotlin
google?.accounts?.oauth2?.revoke(token) {}
```

### 5. Annuler ma modification précédente

Remplacer le bloc `withGis` et `detectBlockerMessage` ajoutés par la version corrigée ci-dessus (retries = 10 comme avant, pas de `detectBlockerMessage`).

## Fichier à modifier

`src/jsMain/kotlin/com/scoreo/infrastructure/google/GoogleIdentityService.kt`

## Tests

Après application, le build doit passer : `./gradlew compileKotlinJs`
