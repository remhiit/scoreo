---
title: Persist accountEmail as the hint for silent token refresh
decision: SyncConfig gains accountEmail (default ''), resolved at login from the OIDC userinfo endpoint and passed to GIS as hint, and a failed refresh no longer clears the sync config.
status: Accepted
date: 2026-08-19
sources: commit 1cf433d, issue #305, PR #306
---

## Context

After every PWA relaunch `GoogleAuthService.accessToken` is `null` (memory only, ADR-0018). The first
auto-sync — about 2.5 s after a match is saved — goes through `ensureFreshToken()` →
`requestAccessToken({ prompt: '' })`. `prompt: ''` alone is not silent: without a `hint`, GIS cannot
tell which account to renew when several Google sessions coexist in the browser, and shows the
account chooser — after every saved match.

## Decision

`SyncConfig` gains `accountEmail`, the authorised account's email, passed to GIS as `hint` on silent
refresh. `GoogleAuthService.login()` resolves it through the OIDC endpoint
`https://openidconnect.googleapis.com/v1/userinfo` (scope `openid email` was already requested)
before returning, and `GoogleDriveSyncAdapter.login()` persists it. This does **not** reverse
ADR-0020: the email no longer comes from an `id_token`, and it is not a connection signal —
"connected" still means an access token in memory.

`ensureFreshToken()` also stops calling `clearSyncConfig()` when the refresh fails: a network error
or an expired Google session used to wipe `lastSyncFileId` (forcing the next sync to rediscover the
Drive file) and would now wipe the `hint`. Only `logout()` clears the configuration.

Old format:

```json
{ "lastSyncTimestamp": 1700000000, "lastSyncFileId": "..." }
```

New format:

```json
{ "lastSyncTimestamp": 1700000000, "lastSyncFileId": "...", "accountEmail": "user@example.com" }
```

Backward compatibility: `accountEmail` has `.default('')` — an older entry decodes with
`accountEmail: ''`, and the refresh is tried without `hint` (previous behaviour, no regression). The
email is filled in at the next explicit login.

The legacy `email` field (ADR-0020) stays purged on load: it belonged to an entry that also carried
the plain-text token. `accountEmail` is a distinct field holding only non-secret data, used only as
the `hint`.

## Consequences

- The CSP's `connect-src` includes `https://openidconnect.googleapis.com`.
