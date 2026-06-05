# Guide d'utilisation — 1000 Sabords

## Écran de configuration

À l'ouverture de l'application, l'écran de configuration permet :

- **Ajouter un joueur** — saisir son nom et cliquer sur "Ajouter"
- **Joueurs connus** — cliquer sur un nom proposé pour l'ajouter
  (mémorisés depuis les parties précédentes)
- **Retirer un joueur** — cliquer sur la croix (✕) à côté du nom
- **Supprimer un joueur connu** — cliquer sur la croix (✕) sur le
  bouton du joueur connu
- **Démarrer la partie** — cliquer sur "Démarrer" (minimum 2 joueurs)

Boutons supplémentaires :

| Bouton | Action |
|---|---|
| 📜 Historique | Consulter les 20 dernières parties archivées |
| 📊 Statistiques | Voir les stats des joueurs connus |
| 📤 Exporter | Ouvre une modale pour exporter l'historique (1kSaBord ou JSON) |
| 📥 Importer | Importer un fichier `.sabords` |

La modale d'export propose deux formats :
- **📤 1kSaBord** — format compressé (LZW + base64, extension `.sabords`)
- **📄 JSON** — format clair et lisible pour intégration externe

## Écran de jeu

### Tableau des scores

Colonnes par joueur, lignes par tour. Chaque cellule affiche le score
du tour. Le score total est affiché en bas de chaque colonne.
Les cellules changent de couleur selon la contribution de chaque type
de coup.

### Panneau du tour

#### Onglet "Calcul" (mode calculatrice)

1. Sélectionner la **carte** du tour dans la liste déroulante
2. Ajuster les **dés** avec les boutons + / − (ou cliquer sur les
   nombres pour utiliser les touches du clavier)
3. Le **score** se met à jour automatiquement avec le détail
4. Cliquer sur **"Valider le score"** pour enregistrer le tour

#### Onglet "Manuel" (mode saisie rapide)

1. Sélectionner la **carte** du tour (le ×2 capitaine est géré ici)
2. Utiliser les **boutons prédéfinis** pour entrer le score (100, 200,
   300, 500, 1000, etc.)
3. Le **multiplicateur** (×1 / ×2) double le score saisi
4. Cliquer sur **"Valider"** pour enregistrer

#### Bouton "☠️ Île" (pénalité)

Permet d'enregistrer un tour avec crânes multiples infligeant une
pénalité aux adversaires. Sélectionner le nombre de crânes, valider.

### Actions en cours de partie

| Action | Bouton |
|---|---|
| Annuler dernier tour | ↩ |
| Nouvelle partie | 🏁 |
| Changer thème | 🌙 / ☀️ |

## Écran de fin

Affiche le podium avec le classement, les scores finaux et le nombre
de manches jouées. Bouton "Nouvelle Partie" pour recommencer.

## Sauvegarde automatique

La partie en cours est automatiquement sauvegardée dans le
**localStorage** du navigateur. Recharger la page restaure l'état
exact (y compris le tour en cours).

## Thème sombre / lumineux

Cliquer sur l'icône 🌙 (nuit) ou ☀️ (jour) en haut à droite pour
basculer. Le choix est mémorisé.

-
