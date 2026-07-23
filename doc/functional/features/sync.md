# Sync — Google Drive Cloud Backup

## Prerequisites

- A `GOOGLE_CLIENT_ID` must be configured at build time (see `doc/technical/deployment.md`)
- Without it, the Sync entry in the burger menu is hidden

## Connection

1. Go to the Sync screen (burger menu ☁)
2. Click "Connect with Google"
3. Google OAuth popup — grant access to the App Data Folder
4. Sync triggers automatically after connection

## Session restore

The OAuth access token is **never persisted** — it lives only in memory (`GoogleAuthService`), for the lifetime of the page (see #51: it used to be stored in plaintext in `scoreo_sync_config`, exploitable via XSS). `scoreo_sync_config` only keeps the non-sensitive `lastSyncTimestamp`/`lastSyncFileId` — no email either (see #108 below).

On every page reload the in-memory token is gone, so the session is restored via a **silent GIS refresh attempted unconditionally**, every time — `CloudSyncRepository.getStatus()`/`ensureFreshToken()` never depend on a persisted email or flag to decide whether to try:
- On mount, the Sync screen immediately shows a **"Restoring session..."** loading view (`SyncPhase.Restoring`) instead of the "Connect with Google" button, so a reloading user can't click Connect while the silent refresh is still in flight
- No popup required
- A silent `requestAccessToken({ prompt: '' })` call fetches a fresh token before the first sync
- Sync then triggers immediately (same flow as a fresh login)
- If the silent refresh fails (e.g. Google consent revoked, or there never was a session), the user is shown the "Connect" screen
- If the silent refresh succeeds but the **auto-sync itself** then fails (network error, API error), the phase falls back to `Disconnected` while the `connected` flag is kept `true` (the account is still authenticated, only the last sync attempt failed). The Sync screen reflects this by showing a **"Disconnect"** button instead of "Connect with Google", so the user can cleanly log out rather than being stuck retrying a silent connect

**Issue #108:** the email used to be extracted from the OAuth `id_token`, but the GIS Token Model (`google.accounts.oauth2.initTokenClient`) never actually returns one in practice (only `access_token`) — so the "connected" signal that was supposed to survive a reload (`config.email !== ''`) was always empty, and the Connect button reappeared after every F5 despite an active Google session. Fix: connected state is decided purely by whether an access token ends up in memory (in-memory already, or obtained via the silent refresh above) — never by a persisted email or flag. The `email` field is gone from `SyncStatus`, `SyncConfig`, and the UI; the Sync screen no longer shows "Connected as {email}".

## How it works

- Storage: **App Data Folder** on Google Drive (invisible to the user, does not count against quota)
- Single file: `scoreo-data.json`
- Scope: `openid email https://www.googleapis.com/auth/drive.appdata`
- OAuth Token Model (GIS) — token kept in memory only (never written to storage), silent refresh via `prompt=""`

## Auto-sync

Triggered after each connection:

1. Reads local data (players, gameTypes, matches)
2. Reads remote data via Drive
3. Compares:
   - Local empty + Drive empty → nothing to do
   - Local empty + Drive has data → auto pull
   - Local has data + Drive empty → auto push (creates the file)
   - Identical → already in sync
   - Different → **conflict** → prompts the user

## Conflict resolution

The user sees both versions (local and remote) with counts and dates. Choice:
- **Keep local** → local data overwrites Drive
- **Keep remote** → remote data overwrites local. This is a real replacement, not a merge: local players/game types/matches absent from the remote data set are deleted (`syncUseCase.writeRemoteToLocal` calls each repository's `deleteAll()` before `saveAll()`). A "Local empty" auto-sync pull (see above) goes through the same path. This is deliberately different from **Import** (see `doc/functional/features/import.md`), which always merges and never deletes existing local data.
  - If the write fails partway through (e.g. localStorage quota exceeded), `writeRemoteToLocal` restores the pre-call local state from an in-memory snapshot taken before the first `deleteAll()`, then rethrows the original error so the UI can display it — the user never ends up with a half-written local state (see #150).

## Offline mode

- `window.navigator.onLine` detects connectivity
- If offline: the Sync screen shows a message
- When back online, the user can trigger sync manually
- No offline queue — full re-sync on reconnection
