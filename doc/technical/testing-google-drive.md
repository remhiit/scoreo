# Tests Google Drive Sync

## Vue d'ensemble

Suites de tests pour la synchronisation Google Drive, toutes exécutables sous Vitest/`jsdom` — aucun navigateur réel requis (contrairement à l'ancienne suite Kotlin/JS qui nécessitait `jsTest`/Karma pour les mêmes tests) :

- `GoogleAuthService` — gestion OAuth et tokens (`src/infrastructure/google/googleAuthService.ts` / `.test.ts`)
- `GoogleDriveSyncAdapter` — synchronisation cloud, adapter `CloudSyncRepository` (`googleDriveSyncAdapter.ts` / `.test.ts`)
- `GoogleDriveClient` — client HTTP Drive API v3 (`googleDriveClient.ts` / `.test.ts`)
- `mockGoogleDriveClient.ts` — double de test manuel, pas de librairie de mock

## Approche : mocker `window.google`/`fetch` plutôt que des tautologies

L'ancienne suite Kotlin ne pouvait pas réellement charger Google Identity Services dans son environnement de test — beaucoup de ses tests se contentaient d'appeler `login()`/`refreshToken()` puis d'asserter `true`, n'exerçant en pratique que le chemin "GIS pas chargé, retry". La suite TS installe un faux `window.google.accounts.oauth2` (`installMockGis()` dans `googleAuthService.test.ts`) et un `fetch` mocké pour `googleDriveClient.test.ts`, ce qui permet de vérifier le comportement réel (succès, erreur, retry, refresh silencieux, "cloud wins" au pull) avec des assertions signifiantes plutôt que des tautologies. Voir le tableau d'audit détaillé dans `doc/reference.md` (section Tests).

## Fichiers de test

| Fichier | Couvre | Points clés |
|---|---|---|
| `googleAuthService.test.ts` | Login, refresh, logout, gestion d'erreur GIS | `installMockGis()` simule `initTokenClient`/`requestAccessToken`/`revoke` ; `vi.useFakeTimers()` pour le retry loop (10 tentatives × 200ms) |
| `googleDriveSyncAdapter.test.ts` | `getStatus`, restauration de session, push/pull, "cloud wins", logout | Utilise `mockGoogleDriveClient.ts` comme double du client HTTP |
| `googleDriveClient.test.ts` | Wrapper REST v3 (find/create/update/read/upsert), mapping d'erreurs HTTP → `SyncException`, retry backoff | `fetch` mocké via `vi.fn()`, un cas par code HTTP mappé (401, 429, 5xx, autre) |
| `mockGoogleDriveClient.ts` | — (double de test, pas un fichier de test) | Simule `findFile`/`createFile`/`updateFile`/`readFile`/`upsertFile`, avec des flags pour simuler des échecs |

## Running Tests

```bash
# Toute la suite (inclut Google Drive/OAuth)
pnpm test

# Juste les tests Google Drive
pnpm exec vitest run src/infrastructure/google
```

## Limitations actuelles

1. **Pas de test E2E avec un vrai compte Google** — le login/logout/refresh réel avec un compte de test est vérifié manuellement (voir la recette fonctionnelle dans `doc/functional/feature.md`), pas dans la suite automatisée.
2. **`fetch` mocké, pas une vraie requête HTTP** — les tests vérifient le contrat (requête envoyée, réponse interprétée), pas la connectivité réseau réelle.

## Maintenance

### Quand ajouter des tests
- Nouvelle fonctionnalité OAuth (scopes, types de token)
- Nouveaux cas d'erreur (timeout réseau, 401, 429)
- Changements d'API Drive
- Modifications de sérialisation `SyncData`/`SyncConfig`

### Check-list avant commit
- [ ] `pnpm test` passe
- [ ] Nouveaux cas de test documentés dans `doc/reference.md` si le compte total change
- [ ] Mocks (`mockGoogleDriveClient.ts`, `installMockGis()`) à jour avec les signatures réelles
- [ ] Happy path et cas d'erreur couverts
