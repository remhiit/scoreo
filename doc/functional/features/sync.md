# Sync — Google Drive Cloud Backup

## Connection

1. Go to the Sync screen (burger menu ☁)
2. Click "Connect with Google"
3. Google OAuth popup — grant access to the App Data Folder
4. Sync triggers automatically after connection

## How it works

- Storage: **App Data Folder** on Google Drive (invisible to the user, does not count against quota)
- Single file: `scoreo-data.json`
- Scope: `drive.appdata` only
- OAuth Token Model (GIS) — silent refresh handled by Google

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
