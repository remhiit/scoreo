# Domaine — Vue d'ensemble

`src/domain/` contient le **noyau métier** du module. Il est écrit en TypeScript pur, sans aucune
dépendance de plateforme : ni React, ni DOM, ni stockage. C'est la transposition ligne à ligne du
domaine Kotlin, vérifiée contre lui par le test différentiel golden (voir
[`../architecture.md`](../architecture.md)).

## Fichiers

| Fichier | Rôle |
|---|---|
| `constantes.ts` | Définitions des types de dés, cartes, bonus, couleurs |
| `lancerDes.ts` | Objet valeur immuable représentant un jet de dés |
| `modeles.ts` | ResultatScore, EvenementCoup (event sourcing), PartieTerminee |
| `calculateurScore.ts` | Fonction pure de calcul de score |
| `partie.ts` | Agrégat racine, rejoué depuis le journal d'événements |

## Principes

- **Immutabilité** — `LancerDes` et `ResultatScore` n'ont que des champs `readonly` : une
  modification produit une copie
- **Pureté** — `calculerScore()` n'a aucun effet de bord, aucun
  état global
- **Event sourcing** — chaque action de jeu est un `EvenementCoup`
  stocké dans l'historique
- **Sérialisation** — chaque objet métier a son schéma zod (`*Schema`), avec un `.default()` par
  champ ajouté : c'est ce qui permet à un brouillon écrit par une version antérieure de se relire

-
