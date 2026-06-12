# P3-02: Tests des 3 repos LocalStorage

## Fichier cible
- `src/jsTest/kotlin/com/scoreo/infrastructure/LocalStorageRepositoryTest.kt`

## Problème
Les 3 repositories LocalStorage sont utilisés en production mais **zéro test**. Tous les tests existants utilisent les InMemory stubs qui ont des comportements différents (pas de JSON, pas de migration).

## Cas à tester

### LocalStoragePlayerRepository
- `save()` puis `getAll()` retourne le joueur
- `save()` deux fois même ID → pas de doublon (P0-03)
- `getAll()` avec `includeInactive=false` filtre les inactifs
- `delete()` marque comme inactif
- `delete()` avec anonymize → nom vidé
- JSON corrompu → `getAll()` retourne liste vide (P0-04)

### LocalStorageGameTypeRepository
- `save()` puis `getAll()` retourne le type
- `findById()` trouvé / non trouvé
- `save()` deux fois même ID → pas de doublon
- JSON corrompu → liste vide

### LocalStorageMatchRepository
- `save()` puis `getAll()` retourne le match
- `findById()` trouvé / non trouvé
- Migration appelée une seule fois (P2-16)
- JSON corrompu → liste vide

## Note technique
Les tests JS nécessitent un environnement avec `localStorage` mocké. Voir si `kotlin.test` + Karma permet de mocker le DOM. Alternative : extraire la persistence dans une interface mockable.

## Effort
2h (setup du mock localStorage + 3 séries de tests).
