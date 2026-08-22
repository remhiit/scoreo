# Événements — Main.kt + Actions.kt

## Délégation d'événements (Main.kt)

Un seul écouteur `click` sur `document` :

```kotlin
document.addEventListener("click", EventListener { event ->
    val el = (event.target as? HTMLElement)?.closest("[data-action]") as? HTMLElement
    el?.getAttribute("data-action")?.let { gérerAction(it, el) }
})
```

`gérerAction()` dispatch via `when` sur la valeur de `data-action` :

```kotlin
fun gérerAction(action: String, élément: HTMLElement) {
    when (action) {
        "ajouter-joueur" -> ajouterJoueur()
        "retirer-joueur" -> retirerJoueur(...)
        "démarrer" -> démarrerPartie()
        "changer-dé" -> changerDé(...)
        // ... ~30 actions
    }
}
```

Les paramètres supplémentaires sont lus depuis les attributs
`data-*` de l'élément (ex : `data-type`, `data-index`).

## Handlers (Actions.kt)

Chaque fonction dans `Actions.kt` correspond à une valeur de
`data-action`. Toutes suivent le même pattern :

1. **Lire** l'état du DOM (inputs, attributs data-*)
2. **Appeler** le domaine (`partie.ajouterCoup()`, etc.)
3. **Persister** (`sauvegarderPartie()`)
4. **Rendre** (`render()`)

### Liste des actions

| data-action | Fonction | Description |
|---|---|---|
| `ajouter-joueur` | `ajouterJoueur()` | Ajoute un joueur depuis l'input |
| `retirer-joueur` | `retirerJoueur(index)` | Retire un joueur de la liste |
| `ajouter-joueur-connu` | `ajouterJoueurParNom(nom)` | Ajoute depuis la liste des connus |
| `supprimer-joueur-connu` | `supprimerJoueurConnu(nom)` | Supprime un joueur connu |
| `démarrer` | `démarrerPartie()` | Démarre la partie |
| `nouvelle-partie` | `confirmerNouvellePartie()` | Nouvelle partie avec confirmation |
| `changer-dé` | `changerDé(type, delta)` | Modifie un compteur de dés |
| `maj-calcul` | `mettreAJourCalcul()` | Recalcule le score affiché |
| `changer-onglet` | `changerOnglet(onglet)` | Bascule entre onglets calc/manual |
| `soumettre-calcul` | `soumettreScoreCalcul()` | Valide le score calculé |
| `soumettre-manuel` | `soumettreScoreManuel()` | Valide le score saisi manuellement |
| `score-rapide` | `scoreRapide(score)` | Bouton de score prédéfini |
| `basculer-mult` | `basculerMultiplicateur()` | Bascule multiplicateur ×1/×2 |
| `effacer-mult` | `effacerMultiplicateur()` | Remet le multiplicateur à 1 |
| `île-rapide` | `îleRapide(crânes)` | Bouton rapide pour l'Île |
| `annuler` | `annulerDernier()` | Annule le dernier coup |
| `basculer-thème` | `basculerTheme()` | Change thème sombre/lumineux |
| `afficher-stats` | `afficherStats()` | Ouvre la modale stats |
| `afficher-historique` | `afficherHistorique()` | Ouvre la modale historique |
| `show-export-modal` | `afficherModalExport()` | Ouvre la modale de choix d'export |
| `détail-partie` | `afficherDétailPartie(index)` | Détail d'une partie archivée |
| `vider-historique` | `viderHistorique()` | Efface tout l'historique |
| `export-history` | `exporterHistorique()` | Télécharge un fichier `.sabords` (LZW) |
| `export-history-json` | `exporterHistoriqueJson()` | Télécharge un fichier `.json` |
| `importer` | `lancerImport()` | Ouvre le sélecteur de fichier |
| `confirmer-nouvelle` | `confirmerNouvellePartie()` | Confirme la réinitialisation |
| `annuler-nouvelle` | (inline) | Ferme la confirmation |

-
