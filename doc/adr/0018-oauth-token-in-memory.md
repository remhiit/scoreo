---
title: OAuth access token in memory only, and a Content-Security-Policy
decision: The Google access token and its expiry are never persisted (removed from SyncConfig and purged on first read), and index.html carries a CSP without 'unsafe-inline' scripts.
status: Accepted
date: 2026-07-13
sources: commit e57b611, issue #51, PR #59
---

## Context

The Google OAuth token was stored in plain text in `localStorage` (key `scoreo_sync_config`),
readable through a devtools, extension or third-party-script dump, or by an XSS payload (security
issue #51).

## Decision

`SyncConfig` (`apps/scoreo/src/infrastructure/google/syncConfig.ts`) no longer holds `accessToken`
nor `expiresAt`. They live only in memory, in `GoogleAuthService.accessToken`/`expiresAt`, never
serialized. Remaining fields at that step: `email`, `lastSyncTimestamp`, `lastSyncFileId`.

Old format:

```json
{ "accessToken": "ya29....", "email": "user@example.com", "lastSyncTimestamp": 1700000000, "lastSyncFileId": "...", "expiresAt": 1700003600000 }
```

New format:

```json
{ "email": "user@example.com", "lastSyncTimestamp": 1700000000, "lastSyncFileId": "..." }
```

Backward compatibility: the zod schema strips `accessToken`/`expiresAt` from an old entry without
error. `loadSyncConfig()` immediately rewrites the cleaned entry on its first read after the update,
purging the leftover plain-text token instead of waiting for the next login/push/pull.

Runtime at the time: after a reload the token is `null`; the session was meant to be restored by a
silent GIS refresh (`requestAccessToken({ prompt: '' })`) whenever a saved `email` signalled a
previous session. That signal never worked (see ADR-0020).

Defense in depth: a `Content-Security-Policy` `<meta>` in `apps/scoreo/index.html` —
`default-src 'self'`, `script-src 'self' https://accounts.google.com` (no `'unsafe-inline'`: the
service-worker bootstrap lives in `public/registerSw.js` to keep it so), `style-src 'self'
'unsafe-inline'`, `connect-src`/`frame-src` scoped to Google's OAuth/Drive endpoints.

## Consequences

- A reload always starts without a token; connected state comes from a silent refresh (ADR-0020,
  ADR-0023).
- The CSP reduces what an XSS can do; it does not replace sanitization.
