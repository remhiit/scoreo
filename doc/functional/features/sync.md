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

On every page reload, if a valid token exists in localStorage (`scoreo_sync_config`), the session is restored automatically:
- No popup required
- Sync triggers immediately (same flow as a fresh login)
- If the token is expired, a silent refresh is attempted (no UI)
- If the silent refresh fails, the user is shown the "Connect" screen

## How it works

- Storage: **App Data Folder** on Google Drive (invisible to the user, does not count against quota)
- Single file: `scoreo-data.json`
- Scope: `openid email https://www.googleapis.com/auth/drive.appdata`
- OAuth Token Model (GIS) — token stored in `scoreo_sync_config`, silent refresh via `prompt=""`
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
