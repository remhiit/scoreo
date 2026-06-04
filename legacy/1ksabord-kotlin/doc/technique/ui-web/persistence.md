# Persistence — Persistence.kt + Compression.kt

Fichiers :
- `src/jsMain/kotlin/fr/ksabord/ui/Persistence.kt`
- `src/jsMain/kotlin/fr/ksabord/ui/Compression.kt`

Gère la sauvegarde des données via le **localStorage** du navigateur
et l'export/import de fichiers `.sabords`.

## Clés localStorage

| Clé | Contenu | Format |
|---|---|---|
| `"partie"` | Partie en cours (état complet) | JSON |
| `"joueurs_connus"` | Liste des noms de joueurs connus | JSON (List<String>) |
| `"historique_parties"` | 20 dernières parties terminées | JSON (List<PartieTerminée>) |
| `"theme"` | Préférence de thème (`"dark"` ou `"light"`) | Texte brut |

## Fonctions

### Partie en cours

| Fonction | Description |
|---|---|
| `sauvegarderPartie()` | Sérialise et sauvegarde l'état de `partie` |
| `restaurerPartie(): Boolean` | Restaure la partie depuis localStorage |
| `effacerPartieSauvegardée()` | Supprime la sauvegarde |

### Joueurs connus

| Fonction | Description |
|---|---|
| `mettreÀJourJoueursConnus()` | Ajoute les joueurs actuels à la liste des connus |
| `obtenirJoueursConnus(): List<String>` | Récupère la liste des joueurs connus |
| `oublierJoueurConnu(nom)` | Supprime un joueur de la liste |

### Historique

| Fonction | Description |
|---|---|
| `archiverPartieTerminée()` | Archive la partie terminée dans l'historique |
| `obtenirHistoriqueParties(): List<PartieTerminée>` | Récupère l'historique |
| `effacerHistoriqueParties()` | Vide l'historique |

### Export / Import

| Fonction | Description |
|---|---|
| `exporterHistorique()` | Compresse en LZW, crée un Blob, déclenche le téléchargement |
| `traiterImport(contenu: String)` | Décompresse, déduplique (par horodatage), fusionne dans l'historique |

## Export `.sabords`

1. Sérialise l'historique en JSON
2. Compresse avec LZW (via `Compression.kt`)
3. Convertit en chaîne Base64 (UTF-16 → octets → Base64)
4. Crée un `Blob` avec `js()` interop
5. Déclenche le téléchargement via lien `<a>` simulé

## Import `.sabords`

1. FileReader lit le fichier en texte
2. Décode Base64 → décompresse LZW → JSON
3. Déduplique les entrées par `horodatage`
4. Ajoute les joueurs inconnus à `joueurs_connus`
5. Sauvegarde le résultat

## SnapshotPartie

Structure sérialisable privée qui capture l'état mutable de `Partie`
pour la persistance (les classes mutables ne sont pas directement
sérialisables).

```kotlin
@Serializable
private data class SnapshotPartie(
    val joueurs: List<RésultatJoueur>,
    val historique: List<ÉvénementCoup>,
    val indexJoueurActuel: Int,
    val dernierTour: Boolean,
    val numéroDernierTour: Int,
    val commencée: Boolean,
    val magiquePirate: Boolean
)
```

-
