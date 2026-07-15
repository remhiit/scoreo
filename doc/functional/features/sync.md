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

The OAuth access token is **never persisted** — it lives only in memory (`GoogleAuthService`), for the lifetime of the page (see #51: it used to be stored in plaintext in `scoreo_sync_config`, exploitable via XSS). `scoreo_sync_config` only keeps the non-sensitive `email`/`lastSyncTimestamp`/`lastSyncFileId`.

On every page reload the in-memory token is gone, so the session is restored via a **silent GIS refresh** whenever a prior session is detected (a saved `email`):
- No popup required
- A silent `requestAccessToken({ prompt: '' })` call fetches a fresh token before the first sync
- Sync then triggers immediately (same flow as a fresh login)
- If the silent refresh fails (e.g. Google consent revoked), the saved session is cleared and the user is shown the "Connect" screen
- If the silent refresh succeeds but the **auto-sync itself** then fails (network error, API error), the phase falls back to `Disconnected` while `email` is kept (the account is still configured, only the last sync attempt failed). The Sync screen reflects this by showing a **"Disconnect"** button instead of "Connect with Google", so the user can cleanly log out rather than being stuck retrying a silent connect

## How it works

- Storage: **App Data Folder** on Google Drive (invisible to the user, does not count against quota)
- Single file: `scoreo-data.json`
- Scope: `openid email https://www.googleapis.com/auth/drive.appdata`
- OAuth Token Model (GIS) — token kept in memory only (never written to storage), silent refresh via `prompt=""`
- Email extracted from the JWT `id_token` (no extra API call)

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
- **Keep remote** → remote data overwrites local

## Offline mode

- `window.navigator.onLine` detects connectivity
- If offline: the Sync screen shows a message
- When back online, the user can trigger sync manually
- No offline queue — full re-sync on reconnection
