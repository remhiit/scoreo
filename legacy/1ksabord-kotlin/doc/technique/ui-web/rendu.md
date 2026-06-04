# Rendu — Rendu.kt

Fichier : `src/jsMain/kotlin/fr/ksabord/ui/Rendu.kt`

Génère tout le HTML de l'application via **string templates Kotlin**.
Pas de DOM virtuel, pas de `createElement`.

## Principe

```kotlin
fun render() {
    document.getElementById("app")!!.innerHTML = buildString {
        append(icôneThème())
        if (!partie.commencée)
            append(renduÉcranConfig())
        else if (partie.estTerminée())
            append(renduÉcranFin())
        else
            append(renduÉcranJeu())
    }
    postRendu()   // attache les écouteurs non-click
}
```

`render()` est appelée après chaque action utilisateur (via
`Actions.kt`). Remplace tout le contenu de `#app` à chaque fois.

## Fonctions de rendu

| Fonction | Description |
|---|---|
| `renduÉcranConfig()` | Écran de configuration : liste joueurs, joueurs connus, boutons démarrer/historique/stats |
| `renduÉcranJeu()` | Écran principal de jeu : tableau des scores, panneau du tour, calculatrice, scores rapides |
| `renduÉcranFin()` | Podium final avec classement, scores, manches |
| `renduModalHistorique()` | Modale historique des 20 dernières parties |
| `renduModalDétailPartie(p)` | Modale détail d'une partie archivée |
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

-
