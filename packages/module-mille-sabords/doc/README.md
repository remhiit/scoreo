# Documentation — 1000 Sabords

Le jeu de dés **1000 Sabords**, compté par ce module dans Scoreo.

## Navigation

| Section | Contenu | Public |
|---|---|---|
| [Fonctionnel](fonctionnel/) | Règles du jeu, guide d'utilisation | Joueurs, utilisateurs |

Le fonctionnement du code se lit dans le code (`src/`, ses types et sa JSDoc) ; la preuve du portage
est le test différentiel golden (`tests/golden/`, ADR-0030). Ce qui appartient au dépôt entier —
build, CI, déploiement, contrat hôte ↔ module (les ADR de `doc/adr/`) — vit à la racine, dans `doc/`.
