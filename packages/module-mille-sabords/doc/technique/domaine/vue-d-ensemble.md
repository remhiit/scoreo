# Domaine — Vue d'ensemble

Le package `fr.ksabord.domaine` contient le **noyau métier** de
l'application. Il est écrit en pur Kotlin multiplateforme, sans
aucune dépendance vers une plateforme (DOM, Android, etc.).

## Fichiers

| Fichier | Rôle |
|---|---|
| `Constantes.kt` | Définitions des types de dés, cartes, bonus, couleurs |
| `LancerDes.kt` | Objet valeur immutable représentant un jet de dés |
| `Modeles.kt` | Tour, ResultatScore, EvenementCoup (event sourcing) |
| `CalculateurScore.kt` | Pure fonction de calcul de score |
| `Partie.kt` | Agrégat racine + singleton mutable |

## Principes

- **Immutabilité** — `LancerDes`, `Tour`, `ResultatScore` sont
  immuables (data classes avec `copy()`)
- **Pureté** — `calculerScore()` n'a aucun effet de bord, aucun
  état global
- **Event sourcing** — chaque action de jeu est un `EvenementCoup`
  stocké dans l'historique
- **Sérialisation** — tous les objets métier sont `@Serializable`
  (kotlinx-serialization) pour la persistance

-
