# Persistence — Persistence.kt + Compression.kt

Fichiers :
- `src/jsMain/kotlin/fr/ksabord/ui/Persistence.kt`
- `src/jsMain/kotlin/fr/ksabord/ui/Compression.kt`
- `src/jsTest/kotlin/fr/ksabord/PersistenceTest.kt`

Gère la sauvegarde des données via le **localStorage** du navigateur,
l'export/import de fichiers `.sabords` (compressés), et l'export JSON
destiné à des systèmes de scores multi-jeux.

## Clés localStorage

| Clé | Contenu | Format |
|---|---|---|
| `"partie"` | Partie en cours (état complet) | JSON |
| `"joueurs_connus"` | Liste des noms de joueurs connus | JSON (List<String>) |
| `"historique_parties"` | Historique des parties terminées (illimité) | JSON (List<PartieTerminée>) |
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
| `archiverPartieTerminée()` | Archive la partie terminée dans l'historique (génère un UUID) |
| `obtenirHistoriqueParties(): List<PartieTerminée>` | Récupère l'historique (backfill UUID pour legacy) |
| `effacerHistoriqueParties()` | Vide l'historique |
| `genererUuid(): String` | Génère un UUID v4 via `crypto.randomUUID()` |

### Export / Import

| Fonction | Description |
|---|---|
| `exporterHistorique()` | Compresse en LZW, crée un Blob, déclenche le téléchargement `.sabords` |
| `exporterHistoriqueJson()` | Export JSON clair (pretty-print) pour intégration externe |
| `traiterImport(contenu: String)` | Décompresse, déduplique (par UUID), fusionne dans l'historique |

## Identifiant UUID

Chaque `PartieTerminée` possède un champ `uuid: String` (UUID v4) généré
automatiquement lors de l'archivage via `crypto.randomUUID()`. Cela permet :

- Une identification stable entre systèmes
- Une déduplication fiable lors de l'import (vs `horodatage` seul)
- Une rétrocompatibilité : les entrées legacy sans UUID reçoivent un UUID
  lors du premier appel à `obtenirHistoriqueParties()` (backfill automatique)

## Export `.sabords` (format natif compressé)

1. Sérialise l'historique en JSON
2. Compresse avec LZW (via `Compression.kt`)
3. Convertit en chaîne Base64 (UTF-16 → octets → Base64)
4. Crée un `Blob` avec `js()` interop
5. Déclenche le téléchargement via lien `<a>` simulé
6. Fichier produit : `1000sabords.sabords`

## Export JSON (format interopérable)

Bouton `📄 JSON` dans la modale d'historique. Produit un fichier
`1000sabords-historique.json` non compressé, pretty-print, destiné à
des systèmes de gestion de scores multi-jeux.

```json
{
  "game": "1000 Sabords",
  "exportedAt": 1717500000000,
  "gameCount": 2,
  "games": [
    {
      "id": "a1b2c3d4-...",
      "timestamp": 1717500000000,
      "rounds": 8,
      "ranking": [
        { "name": "Alice", "score": 7200, "rank": 1 },
        { "name": "Bob", "score": 5400, "rank": 2 }
      ],
      "details": [
        { "type": "calculateur", "joueur": "Alice", "score": 1200, ... }
      ]
    }
  ]
}
```

Champs de l'enveloppe :

| Champ | Type | Description |
|---|---|---|
| `game` | String | Identifiant du jeu (`"1000 Sabords"`) |
| `exportedAt` | Long | Timestamp de l'export (ms) |
| `gameCount` | Int | Nombre de parties exportées |
| `games` | Array | Liste des parties |

Champs d'une partie (`games[]`) :

| Champ | Type | Description |
|---|---|---|
| `id` | String | UUID unique de la partie |
| `timestamp` | Long | Date de fin de partie (ms) |
| `rounds` | Int | Nombre de manches jouées |
| `ranking` | Array | Classement final (trié par score décroissant) |
| `details` | Array | Coups joués (event sourcing, vide si absent) |

## Import `.sabords`

1. FileReader lit le fichier en texte
2. Décode Base64 → décompresse LZW → JSON
3. Déduplique les entrées par `uuid` (fallback `horodatage` pour legacy)
4. Ajoute les joueurs inconnus à `joueurs_connus`
5. Sauvegarde le résultat

## SnapshotPartie

Structure sérialisable privée qui capture l'état mutable de `Partie`
pour la persistance (les classes mutables ne sont pas directement
sérialisables).

```kotlin
@Serializable
private data class SnapshotPartie(
    val joueurs:            List<RésultatJoueur>,
    val historique:         List<ÉvénementCoup>,
    val index:              Int,
    val dernierTour:        Boolean,
    val numeroDernierTour:  Int,
    val commencee:          Boolean,
    val magiquePirate:      Boolean = false,
)
```

## Tests unitaires (JS)

Les tests de persistence sont dans `jsTest/kotlin/fr/ksabord/PersistenceTest.kt`.
Ils couvrent :

- Génération et format des UUID
- Archivage avec UUID
- Backfill des entrées legacy sans UUID
- Construction de l'enveloppe d'export JSON
- Mapping des champs (id, ranking, details)

Exécution : `./gradlew jsNodeTest`
