# Rendu — Rendu.kt

Fichier : `src/jsMain/kotlin/fr/ksabord/ui/Rendu.kt`

Génère tout le HTML de l'application via **string templates Kotlin**.
Pas de DOM virtuel, pas de `createElement`.

## Principe

```kotlin
fun render() {
    document.getElementById("app")!!.innerHTML = buildString {
        append(iconeTheme())
        if (!partie.commencee)
            append(renduEcranConfig())
        else if (partie.estTerminee())
            append(renduEcranFin())
        else
            append(renduEcranJeu())
    }
    postRendu()   // attache les écouteurs non-click
}
```

`render()` est appelée après chaque action utilisateur (via
`Actions.kt`). Remplace tout le contenu de `#app` à chaque fois.

## Fonctions de rendu

| Fonction | Description |
|---|---|
| `renduEcranConfig()` | Écran de configuration : liste joueurs, joueurs connus, boutons démarrer/historique/stats |
| `renduEcranJeu()` | Écran principal de jeu : tableau des scores, panneau du tour, calculatrice, scores rapides |
| `renduEcranFin()` | Podium final avec classement, scores, manches |
| `renduModalHistorique()` | Modale historique des 20 dernières parties |
| `renduModalDetailPartie(p)` | Modale détail d'une partie archivée |
| `renduModalStats()` | Modale statistiques des joueurs connus |
| `renduCelluleCoup(coup)` | Cellule du tableau de scores avec couleur par type |

## Sécurisation XSS

```kotlin
fun escHtml(str: String): String
```

Utilise `div.textContent` / `innerHTML` pour échapper les noms
des joueurs (seule source de contenu utilisateur). Toujours
appliquée quand un nom de joueur est injecté dans le HTML.

## postRendu()

Attache les écouteurs qui ne peuvent pas être déclarés en HTML :

- Touche `Entrée` sur les champs de saisie joueur
- Changement de la liste déroulante des cartes (`<select>`)
- Autres événements non-click

```kotlin
fun postRendu() {
    document.getElementById("input-joueur")?.addEventListener("keydown", ...)
    document.getElementById("carte")?.addEventListener("change", ...)
}
```

## Thème

Défini dans `jsMain/resources/index.html` via des **CSS custom properties**
sur `:root` (thème sombre, défaut) et `[data-theme="light"]`.

### Variables CSS

| Variable | Sombre (`:root`) | Clair (`[data-theme="light"]`) | Usage |
|---|---|---|---|
| `--bg` | `#0f0e17` | `#f4efe6` | Fond général |
| `--surface` | `#1a1932` | `#ffffff` | Cartes, panneaux |
| `--surface2` | `#242347` | `#ede8de` | Surfaces secondaires |
| `--surface3` | `#2e2d54` | `#d6cfc3` | Bordures, hover |
| `--primary` | `#e6a817` | `#c4900a` | Accent principal |
| `--primary-dark` | `#b8860b` | `#a67708` | Hover boutons primaires |
| `--danger` | `#e74c3c` | `#c0392b` | Actions destructrices |
| `--success` | `#2ecc71` | `#27ae60` | Scores positifs |
| `--text` | `#f0e6d3` | `#2c3e50` | Texte principal |
| `--text-dim` | `#8a8198` | `#7f8c8d` | Texte secondaire |
| `--accent` | `#ff6b35` | `#d35400` | Accent chaud, Magie Pirate |
| `--radius` | `10px` | `10px` | Rayon de bordure |

### Couleurs des joueurs

Définies dans la classe `.player-colors` dans `index.html`, dont les valeurs
sont le miroir de `COULEURS_JOUEURS` dans `Constantes.kt`.

| Variable | Couleur | Index |
|---|---|---|
| `--c0` | `#e6a817` | Joueur 1 |
| `--c1` | `#e74c3c` | Joueur 2 |
| `--c2` | `#2ecc71` | Joueur 3 |
| `--c3` | `#3498db` | Joueur 4 |
| `--c4` | `#9b59b6` | Joueur 5 |
| `--c5` | `#e67e22` | Joueur 6 |
| `--c6` | `#1abc9c` | Joueur 7 |
| `--c7` | `#fd79a8` | Joueur 8 |

### Bascule

- Bouton dans le coin haut-droit, action `toggle-theme`
- Handler `basculerTheme()` dans `Actions.kt` (lit/change `data-theme` sur `<html>`)
- Sauvegarde dans `localStorage` clé `"theme"` (valeurs : `"dark"` / `"light"`)
- Restauré au démarrage dans `Main.kt`

**Contrainte :** tout le CSS utilise exclusivement les custom properties.
Les couleurs joueurs dans le code Kotlin/HTML utilisent `COULEURS_JOUEURS`
depuis `Constantes.kt`, jamais de valeurs en dur.

-


