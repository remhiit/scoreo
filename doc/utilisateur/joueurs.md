# Joueurs

Les joueurs se gèrent depuis l'écran **Accueil**.

## Ajouter un joueur

Tapez son nom dans le champ **Nom du joueur**, puis **Ajouter** (ou Entrée). Le joueur apparaît dans
la liste et le champ se vide.

## La liste des joueurs

Chaque ligne montre :

- le nom du joueur ;
- son bilan de victoires et de défaites, toutes parties confondues ;
- un badge avec son nombre de trophées, s'il en détient au moins un. Un trophée partagé ex aequo
  compte comme un trophée entier ; un trophée détenu plusieurs fois (un record sur deux jeux
  différents, cinq mois gagnés au palmarès mensuel) compte autant de fois. Le détail des trophées
  est sur la fiche du joueur, dans les [Statistiques](statistiques.md#la-fiche-dun-joueur) ;
- un bouton pour le renommer et un bouton pour le supprimer.

Appuyer sur la ligne sélectionne le joueur pour la prochaine partie.

## Renommer un joueur

Le bouton crayon ouvre la fenêtre **Renommer {nom}**. Corrigez le nom, puis **Confirmer** (ou
Entrée) ; **Annuler**, ou un appui en dehors de la fenêtre, abandonne. Le joueur garde son
historique, ses statistiques et ses trophées : seul son nom change, partout.

## Supprimer un joueur

Le bouton corbeille ouvre la fenêtre **Supprimer {nom} ?**, qui rappelle que **les parties seront
conservées**. Le joueur disparaît de l'Accueil, mais ses parties restent dans l'historique et dans
les statistiques des autres.

La case **Effacer le nom de l'historique** décide de ce qu'affiche ensuite l'historique :

- décochée, le joueur y apparaît comme « Alice (deleted) » ;
- cochée, son nom est effacé et il apparaît comme « Deleted player ».

## Fusionner des doublons

Un import, ou une faute de frappe, peut créer plusieurs joueurs pour une même personne
(« Jean-Luc », « Jean Luc », « JeanLuc »). Le bouton **Fusionner**, sous la liste, apparaît dès
qu'il existe au moins deux joueurs (supprimés compris) et ouvre la fenêtre **Fusionner des
joueurs** :

1. choisissez le **Joueur à conserver** ;
2. cochez un ou plusieurs **Doublons à supprimer** ; le joueur conservé n'y figure pas ;
3. la fenêtre indique combien de parties seront transférées ;
4. **Fusionner** transfère toutes les parties des doublons au joueur conservé, puis supprime
   définitivement les doublons.

Les joueurs supprimés figurent aussi dans ces listes, marqués « (supprimé) » : un doublon peut avoir
été supprimé avant qu'on pense à le fusionner. Si le joueur conservé était supprimé et qu'un doublon
ne l'était pas, le joueur conservé redevient actif.

Bilans, Elo et trophées sont recalculés à partir de l'historique fusionné. Une partie en cours qui
faisait jouer un doublon est abandonnée.

**Fusion impossible** : si une partie oppose déjà deux des joueurs sélectionnés, la fenêtre
l'indique en rouge et **Fusionner** reste grisé — la fusion ferait jouer quelqu'un contre lui-même.
Décochez l'un des deux pour continuer.

## Nettoyer les joueurs inactifs

Un joueur supprimé qui n'a jamais joué aucune partie n'a plus de raison d'être conservé. Quand il en
existe, un bouton **Nettoyer (N)** apparaît sous la liste ; il ouvre une fenêtre qui les nomme.
**Supprimer définitivement** les efface pour de bon — l'action est irréversible ; **Annuler** ne
touche à rien.
