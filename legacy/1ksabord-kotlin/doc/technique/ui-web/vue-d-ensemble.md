# UI Web — Vue d'ensemble

Package `fr.ksabord.ui` dans `jsMain/`.

Adaptateur **primaire** (interface utilisateur) pour la cible web
Kotlin/JS. Dépend du domaine, jamais l'inverse.

## Fichiers

| Fichier | Rôle |
|---|---|
| `Main.kt` | Point d'entrée, délégation d'événements clic |
| `EtatTour.kt` | État mutable du tour courant (dés, carte, onglet) |
| `Actions.kt` | Handlers des actions utilisateur |
| `Rendu.kt` | Génération HTML (string templates) |
| `Persistence.kt` | Sauvegarde localStorage + export/import LZW |
| `Compression.kt` | Compression LZW pour fichiers `.sabords` |
| `Stats.kt` | Statistiques des joueurs connus |

## Principes

- **Pas de framework JS** — tout est Kotlin/JS pur
- **Pas de DOM API** — pas de `createElement`, uniquement
  `innerHTML` via string templates
- **Rendu complet** — `render()` reconstruit intégralement `#app`
- **Délégation d'événements** — un seul listener `click` sur
  `document`, dispatch via `data-action`
- **Français** — noms de fonctions, variables et textes UI en français

-
