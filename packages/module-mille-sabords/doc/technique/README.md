# Documentation technique

À destination des **développeurs** du module 1000 Sabords.

## Structure

```
doc/technique/
├── architecture.md              # Les trois couches, ce que l'hôte fournit, la preuve du portage
├── domaine/                     # Noyau métier (pure logique)
│   ├── vue-d-ensemble.md
│   ├── constantes.md
│   ├── lancer-des.md
│   ├── modeles.md
│   ├── calculateur-score.md
│   └── partie.md
└── ui/                          # L'écran du module dans Scoreo
    ├── vue-d-ensemble.md
    ├── reducteur.md
    └── etat-de-tour.md
```

Ce qui concerne le dépôt entier — build, CI, déploiement, contrat hôte ↔ module — est documenté une
seule fois, à la racine : voir `doc/technical/`.
