# 🏴‍☠️ 1000 Sabords — Compteur de points

Application **Kotlin Multiplatform (KMP)** pour compter les points du jeu de dés **1000 Sabords** (aussi connu sous le nom *Mille Sabords*).

La cible principale est **web** (via Kotlin/JS). Une cible **Android native** (Compose) est préparée et sera activée dès qu'un Android SDK est disponible.

## Le jeu

1000 Sabords est un jeu de dés d'ambiance sur le thème pirate. À chaque tour, les joueurs lancent 8 dés et tentent de réaliser des combinaisons pour marquer un maximum de points. Mais attention aux crânes ! Trois crânes ou plus et c'est le bust — aucun point pour ce tour.

### Éléments de scoring

| Élément | Effet |
|---|---|
| 💎 Diamant / 🪙 Or | 100 pts chacun + bonus de série |
| 🐒🦜⚔️ Séries | 3+ identiques : bonus de 100 à 4000 pts |
| 💀 Crânes | 3+ = bust (0 pts) |
| ☠️ Île de la Tête de Mort | 4+ crânes = pénalité pour les adversaires |
| 🎁 Coffre plein | 8 dés qui scorent = +500 pts bonus |

### Cartes

Chaque tour commence par le tirage d'une carte qui modifie les règles :
👑 Capitaine (×2), 💎 Diamant (+1), 🪙 Or (+1), 🐒🦜 Animaux, 🧙 Sorcière, ⚔️ Combat naval (2/3/4 sabres), 💀 Têtes de mort (+1/+2).

## Fonctionnalités

- 🎲 **Calculateur de score** — sélectionner la carte et les dés, le score est calculé automatiquement
- ✏️ **Saisie rapide** — boutons prédéfinis pour entrer le score manuellement
- ↩ **Annulation** — possibilité d'annuler le dernier tour
- 💾 **Sauvegarde automatique** — la partie en cours est sauvegardée dans le localStorage et restaurée au rechargement
- ⭐ **Joueurs connus** — les noms des joueurs sont mémorisés et proposés en accès rapide lors des prochaines parties
- 📜 **Historique des parties** — les parties terminées sont archivées (20 dernières) et consultables depuis l'écran d'accueil
- 🌙☀️ **Thème sombre / lumineux** — avec mémorisation du choix
- 📱 **Responsive** — fonctionne sur mobile et desktop

## Architecture

Le projet suit une **architecture hexagonale** (Ports & Adapters) combinée à une approche **Domain-Driven Design (DDD)** :

- Le **noyau domaine** (`fr.ksabord.domaine`) est pur Kotlin multiplateforme — aucune dépendance vers le DOM, le localStorage ou Android
- Les **adaptateurs** (UI web, ViewModel Android, persistence localStorage) dépendent du domaine, jamais l'inverse
- Le **langage ubiquitaire** est le français : `Partie`, `Tour`, `LancerDés`, `calculerScore`…

## Déploiement

Un workflow **GitHub Actions** (`.github/workflows/deploy-pages.yml`) build et déploie automatiquement l'application sur **GitHub Pages** à chaque push sur `main`.

Activer dans Settings → Pages → Source: **GitHub Actions**.

Voir [`kotlin/README.md`](kotlin/README.md) pour le schéma complet, les détails DDD et les commandes de build.


