---
title: Remove the persisted email; connected means an access token in memory
decision: email is removed from SyncConfig, SyncStatus and the UI, and the connected state is decided only by an access token in memory, obtained directly or by a silent GIS refresh attempted unconditionally.
status: Accepted
date: 2026-07-16
sources: commit 2766681, issue #108; commit cb9344b (purge on load)
---

## Context

The signed-in email was supposed to come from an OAuth `id_token`, but the GIS Token Model
(`google.accounts.oauth2.initTokenClient`) never returns one — only `access_token`.
`syncConfig.email` therefore stayed empty, and since the token is deliberately never persisted
(ADR-0018), the signal meant to mark a restorable session after a reload (`config.email !== ''`)
never worked: `getStatus()` fell back to `connected: false` on every reload.

## Decision

`email` is removed from `SyncConfig` (`apps/scoreo/src/infrastructure/google/syncConfig.ts`), from
`SyncStatus` (`apps/scoreo/src/domain/port/cloudSyncRepository.ts`), from
`GoogleAuthService.idToken` (no longer decoded at all), and from the UI (the Sync screen no longer
shows "Connected as {email}"). "Connected" is decided only by an access token in memory
(`GoogleAuthService.accessToken`), obtained directly or through a silent GIS refresh attempted
unconditionally by `getStatus()`/`ensureFreshToken()` — never conditioned by an email or a persisted
flag. `SyncState` (`apps/scoreo/src/ui/sync/syncTypes.ts`) replaces `email: string | null` with
`connected: boolean`, which stays `true` after a successful login even if the following auto-sync
fails (behaviour of issue #97 preserved).

Old format:

```json
{ "email": "user@example.com", "lastSyncTimestamp": 1700000000, "lastSyncFileId": "..." }
```

New format:

```json
{ "lastSyncTimestamp": 1700000000, "lastSyncFileId": "..." }
```

Backward compatibility: the zod schema strips `email` from an old entry without error — no code
migration needed. `loadSyncConfig()` rewrites the cleaned entry on first access, as for the
`accessToken`/`expiresAt` fields purged by ADR-0018.

## Consequences

- The legacy `email` stays purged on load even after `accountEmail` is added (ADR-0023): it belonged
  to an entry that also carried the plain-text token.
