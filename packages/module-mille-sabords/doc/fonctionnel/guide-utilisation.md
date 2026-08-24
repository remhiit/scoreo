# Guide d'utilisation — 1000 Sabords

1000 Sabords se joue **dans Scoreo**. Ce guide décrit l'écran du module ; tout ce qui l'entoure —
les joueurs, l'historique, les statistiques, l'export, le thème — appartient à Scoreo et est
documenté dans `doc/functional/` à la racine du dépôt.

## Ouvrir une partie

Depuis l'accueil de Scoreo : sélectionner les joueurs (2 à 8), **Nouvelle partie**, puis
**1000 Sabords**. Le module s'ouvre directement sur l'écran de jeu — il n'a pas d'écran de
configuration à lui, puisque les joueurs viennent de l'hôte.

Rouvrir une partie enregistrée depuis l'historique de Scoreo revient sur le module, sa grille
restaurée.

## L'écran de jeu

Deux colonnes : le tableau de bord à gauche, le tour en cours à droite. En tête, le nom du jeu et un
badge qui dit où en est la partie — **Tour N**, **⚠️ Dernier tour !** une fois les 6000 points
franchis, ou **🏁 Partie terminée**.

### Le tableau de bord

Une ligne par manche, une colonne par joueur, le score du coup dans chaque cellule et le total en
bas. Les cellules se teintent selon ce qui s'est passé : un tour à zéro, une pénalité négative, une
Île de la Tête de Mort. Le meneur est mis en avant, et le franchissement des 6000 points aussi.

Quatre actions dessous :

| Bouton | Ce qu'il fait |
|---|---|
| ↩ Annuler le coup | Retire le dernier coup joué. La partie est rejouée depuis son journal pour recalculer les totaux |
| 🏁 Terminer la partie | Arrête la partie avant les 6000 points, quand la table décide d'en rester là |
| ⏸ Quitter (reprise plus tard) | Rend la main à Scoreo **sans rien perdre** : la partie reprend où elle en était |
| 🗑 Abandonner | Jette la partie en cours, après confirmation. Rien n'est enregistré dans Scoreo |

### Le tour en cours

Le joueur dont c'est le tour est annoncé en haut. Deux onglets, deux façons de compter le même tour.

#### 🎲 Calculateur

1. Choisir la **carte piochée** dans la liste (capitaine, sorcière, combat naval, animaux…).
2. Ajuster les six compteurs de dés avec les boutons **−** et **+** : crâne, diamant, or, singe,
   perroquet, sabre.
3. Le score se calcule en direct, avec son détail, et un rappel indique combien de dés sont posés
   sur les 8 attendus.
4. **Valider le score** enregistre le tour et passe au joueur suivant.

#### ✏️ Saisie rapide

Pour les tables qui comptent plus vite que l'application.

1. Taper le score, ou l'assembler avec les **boutons de scores fréquents**.
2. **🎩 ×2** applique le multiplicateur du capitaine ; il se retire d'un clic.
3. **🗑** remet le score à zéro.
4. **Valider** enregistre le tour.

Le groupe **☠️ Île de la Tête de Mort** enregistre en un bouton un tour qui inflige la pénalité aux
adversaires : choisir le nombre de crânes, la pénalité est appliquée à chacun d'eux.

## L'écran de fin

Il remplace l'écran de jeu dès que la partie est finie — 6000 points franchis et dernier tour joué,
Magie Pirate, ou fin demandée par la table.

Il affiche le vainqueur, son score et le classement complet. **💾 Enregistrer la partie** la range
dans l'historique de Scoreo et rend la main ; **↩ Annuler le dernier coup** revient en arrière si la
partie s'est terminée par erreur.

## La reprise après fermeture

Le module sauvegarde en continu, à travers Scoreo, **la partie et le tour en cours** : les dés
saisis, l'onglet actif, le multiplicateur et la carte piochée. Fermer l'onglet en plein comptage ne
perd rien — c'est précisément ce que l'application autonome perdait avant la fusion.
