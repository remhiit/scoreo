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

The user sees both versions (local and remote) with counts and dates, one `.sync-card` each — a real card (`--surface-card` background, `--border-subtle` border, `--shadow-sm`), not a sunken zone. `.sync-conflict-container` always lays the two cards out side by side (`flex-direction: row`), including on mobile, since stacking them would defeat the local/remote comparison. Choice:
- **Keep local** → local data overwrites Drive
- **Keep remote** → remote data overwrites local. This is a real replacement, not a merge: local players/game types/matches absent from the remote data set are deleted (`syncUseCase.writeRemoteToLocal` calls each repository's `deleteAll()` before `saveAll()`). A "Local empty" auto-sync pull (see above) goes through the same path. This is deliberately different from **Import** (see `doc/functional/features/import.md`), which always merges and never deletes existing local data.
  - If the write fails partway through (e.g. localStorage quota exceeded), `writeRemoteToLocal` restores the pre-call local state from an in-memory snapshot taken before the first `deleteAll()`, then rethrows the original error so the UI can display it — the user never ends up with a half-written local state (see #150).

## Offline mode

- `window.navigator.onLine` detects connectivity
- If offline: the Sync screen shows a message
- When back online, the user can trigger sync manually
- No offline queue — full re-sync on reconnection

## Auto-sync after local changes

Beyond the login-time `autoSync()` above, every local mutation (add/edit/delete a player, game type, or match) is pushed to Drive automatically, without the user visiting the Sync screen:

1. The 3 synchronizable localStorage repositories (`Player`, `GameType`, `Match`) call `DataChangeNotifier.notifyChanged()` after every write (`save`, `saveAll`, `delete`, `hardDelete`, `deleteAll`). Reads never notify. `matchDraftRepository` (ephemeral draft, not part of `SyncData`) never notifies.
2. `AutoSyncCoordinator` (`application/autoSyncCoordinator.ts`) subscribes to the notifier, debounces changes by ~2.5s so a burst of edits (e.g. entering a round's scores) collapses into a single push, checks connectivity via the `ConnectivityChecker` port (`BrowserConnectivityChecker`, `infrastructure/browser/`), then calls `SyncUseCase.pushLocalData()`. Errors (expired token, network) are swallowed — the next local change reschedules a push, there's no retry queue.
3. `pushLocalData()` pushes the full local snapshot (like a "keep local" conflict resolution, but silent) and returns `{ pushed, pulled: 0, timestamp }`.
4. The coordinator is started/stopped by the `useAutoSync` hook (`src/ui/sync/useAutoSync.ts`), called once from `AppShell`. It's a no-op when `services.syncUseCase` is undefined (no `VITE_GOOGLE_CLIENT_ID`).
5. To avoid an infinite loop, writing pulled/remote data back to local storage (`SyncUseCase.writeRemoteToLocal`, used by `autoSync()`'s pull branch and `resolveConflict(false)`) runs inside `notifier.runMuted(...)` and therefore does **not** trigger a notification — only genuine local edits (through the UI's use cases) do.
6. This is last-writer-wins: the local push can silently overwrite remote changes made from another device that were never pulled. Conflict detection still only happens at login/session-restore (see above), not on every auto-push.
