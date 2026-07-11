# Migrations

## v1 → v2 (UUID ids + timestamp dates)

**Background:** initial format used 12-char alphanumeric IDs and ISO date strings (`"YYYY-MM-DD"`).

**Changes:**
- `Match.id`: 12-char random → UUID v4
- `Match.date`: `String` → `Long` (epoch milliseconds)

**Migration:** handled automatically in `LocalStorageMatchRepository.migrateIfNeeded()`.

**Logic:**
1. Read raw JSON from `localStorage` key `scoreo_matches`
2. For each match object:
   - If `date` is a `String` → parse with `LocalDate.parse()`, convert to epoch ms at UTC midnight, replace value
   - If `id` does not match UUID v4 pattern → replace with a new UUID v4 via `IdGenerator.newId()`
3. If any object changed, write the migrated array back to `localStorage`

**Trigger:** runs on every call to `getAll()`. Idempotent — once all data is migrated, subsequent reads skip migration.

**Format of `IdGenerator.newId()` output:** `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` (standard UUID v4).

---

## v1.x → v1.2 (Game Type Archive)

**Background:** Game types can now be archived (soft-deleted) instead of permanently deleted. Users can archive old/test games to keep the selection dropdown clean.

**Schema Change**

`GameType` model adds field `active: Boolean = true`.

**Old format** (v1.1):
```json
{
  "id": "...",
  "name": "Belote",
  "winCondition": "HIGHEST_SCORE",
  "tieBreakRule": "NONE",
  "tieBreakCondition": "HIGHEST_SCORE"
}
```

**New format** (v1.2):
```json
{
  "id": "...",
  "name": "Belote",
  "winCondition": "HIGHEST_SCORE",
  "tieBreakRule": "NONE",
  "tieBreakCondition": "HIGHEST_SCORE",
  "active": true
}
```

**Backward Compatibility**

- Old JSON without `active` field deserializes with `active = true` (Kotlinx serialization's `ignoreUnknownKeys` enabled, plus field has default value).
- No explicit migration needed.
- New code reads `active` correctly on deserialization.

**Behavior Changes**

- `GetGameTypesUseCase` excludes `active = false` (archived) games from selection dropdown.
- `HistoryScreen` still resolves archived games via `GameTypeRepository.findById()` (includes inactive).
- Users can archive games via "Archive" button in GameTypeScreen detail view.

---

## v1.x → v1.2+ (Player Archive)

**Background:** Players can now be archived (soft-deleted) instead of permanently deleted.

**Schema Change**

`Player` model adds field `active: Boolean = true`.

**Backward Compatibility**

- Old JSON without `active` field deserializes with `active = true`.
- No explicit migration needed.

**Behavior Changes**

- `GetPlayersUseCase` excludes `active = false` (archived) players by default.
- Players can be archived via "Delete" action in HomeScreen players list.

---

## v1.x → v1.2+ (Tie-Break Rule Enhancements)

**Background:** Game types now support configurable tie-break rules to handle equality in scoring.

**Schema Changes**

`GameType` model adds fields:
- `tieBreakRule: TieBreakRule = TieBreakRule.NONE`
- `tieBreakCondition: WinCondition = WinCondition.HIGHEST_SCORE`
- `tieBreakLabel: String? = null`

**Backward Compatibility**

- Old JSON without these fields deserializes with default values.
- No explicit migration needed.

**Behavior Changes**

- Game types can specify how ties are handled: NONE (all tied win), MANUAL_SELECTION (user picks), SECONDARY_SCORE (secondary metric).
- `ScoreDetailScreen` shows tie-break dialogs when needed.

---

## v1.x → v1.3+ (Match Draft Auto-Save)

**Background:** Incomplete matches are auto-saved to allow resuming later.

**Schema Changes**

New model `MatchDraft` with fields:
- `gameTypeId: String`
- `playerIds: List<String>`
- `rounds: List<Map<String, String>>`
- `timestamp: Long`

Stored in localStorage under key `scoreo_match_draft`.

**Backward Compatibility**

- New localStorage key; old users have no draft initially.
- No explicit migration needed.

**Behavior Changes**

- `ScoreDetailScreen` auto-saves to MatchDraft after each score update.
- `HomeScreen` displays "Resume match in progress" banner if a draft exists.

---

## `scoreo_theme` → `scoreo_flavor` + `scoreo_accent` (Catppuccin theme)

**Background:** the binary dark/light toggle is replaced by the Ludo
design system's Catppuccin theme — 4 flavors (`latte`/`frappe`/
`macchiato`/`mocha`) plus an independently swappable accent hue (14
presets, default `mauve`).

**Storage Change**

- Old key `scoreo_theme`: `"dark"` or `"light"`.
- New keys: `scoreo_flavor` (one of the 4 flavor names) and
  `scoreo_accent` (one of the 14 hue names).

**Backward Compatibility**

`ThemeManager.readInitialFlavor()` migrates on read, the first time a
user without `scoreo_flavor` loads the app:
- `scoreo_theme == "dark"` → flavor `"mocha"`
- `scoreo_theme == "light"` → flavor `"latte"`
- neither key present → `prefers-color-scheme: dark` decides (`mocha`
  or `latte`)

Accent always defaults to `"mauve"` for users migrating from the old
scheme (there was no accent concept before). `scoreo_flavor`/
`scoreo_accent` are written immediately on first read, so migration
runs at most once per user. `scoreo_theme` is **not** deleted — it's
simply never read again once `scoreo_flavor` exists — so a rollback
to a pre-Catppuccin build would still find a valid (if stale) value.

**Behavior Changes**

- The header's 🌙/☀️ toggle button is gone. Theme is picked from the
  burger menu's "🎨 Theme" entry, which opens a dialog with 4 flavor
  chips + 14 accent swatches (`ThemePickerDialog`).
- `data-theme` on `<html>` now holds a flavor name (`"latte"`, …)
  instead of being present-only-for-dark (`"dark"` or absent). Any
  code or CSS keying off `data-theme="dark"` specifically is dead —
  the semantic tokens are flavor-aware directly instead.

---

## `SyncConfig` — retrait des champs `accessToken`/`expiresAt` (issue #51)

**Contexte :** le token OAuth Google était stocké en clair dans `localStorage` (clé `scoreo_sync_config`), exploitable en cas de XSS (issue de sécurité #51).

**Changement :** `SyncConfig` (`src/infrastructure/google/syncConfig.ts`) ne contient plus `accessToken` ni `expiresAt`. Ces deux valeurs vivent désormais uniquement en mémoire, dans `GoogleAuthService.accessToken`/`expiresAt` (jamais sérialisées). Champs restants, inchangés : `email`, `lastSyncTimestamp`, `lastSyncFileId`.

**Ancien format :**
```json
{ "accessToken": "ya29....", "email": "user@example.com", "lastSyncTimestamp": 1700000000, "lastSyncFileId": "...", "expiresAt": 1700003600000 }
```

**Nouveau format :**
```json
{ "email": "user@example.com", "lastSyncTimestamp": 1700000000, "lastSyncFileId": "..." }
```

**Compatibilité ascendante :** le schéma zod strip nativement `accessToken`/`expiresAt` d'une ancienne entrée sans erreur. `loadSyncConfig()` réécrit immédiatement l'entrée nettoyée dans `localStorage` dès sa première lecture après la mise à jour, purgeant le token en clair résiduel plutôt que d'attendre un prochain `login()`/`push()`/`pull()`.

**Comportement runtime :** au rechargement de page, `authService.accessToken` est `null` (rien à restaurer depuis le storage). La session est restaurée via un rafraîchissement silencieux GIS (`requestAccessToken({ prompt: '' })`) dès qu'un `email` sauvegardé indique une session précédente — voir `doc/functional/features/sync.md` § Session restore.

---

## Note technique : moteur de sérialisation (zod)

**Contexte historique :** le projet était initialement écrit en Kotlin/JS avec `kotlinx.serialization` (`Json { ignoreUnknownKeys = true }` + valeurs par défaut sur les data class). La réécriture complète vers React/TypeScript (achevée) a changé le moteur de (dé)sérialisation sans jamais changer le format JSON stocké dans `localStorage` — mêmes clés, mêmes champs, mêmes valeurs par défaut, à chaque étape.

Le moteur actuel : schémas [zod](https://zod.dev) avec `.default()` par champ (`src/domain/model/*.schema.ts`), qui strip nativement les clés inconnues à la validation (comportement équivalent à l'ancien `ignoreUnknownKeys`).

27 tests de contrat backward-compat dans `src/domain/model/serialization.contract.test.ts` : chaque cas vérifie qu'un JSON dans un ancien format (sans les champs ajoutés depuis) se décode toujours avec les mêmes valeurs par défaut.

## Test de migration croisée

`src/infrastructure/crossMigration.test.ts` rejoue, dans un seul snapshot
`localStorage`, le format le plus ancien documenté sur cette page : joueurs et
types de jeu sans `active`, types de jeu sans champs tie-break, matches au
format v1 (ids 12 caractères, dates `"YYYY-MM-DD"`, sans `manualWinners`/
`secondaryPlayerScores`), et la clé legacy `scoreo_theme` au lieu de
`scoreo_flavor`/`scoreo_accent` — sans `scoreo_match_draft` ni
`scoreo_sync_config` (plus récents que ce snapshot). Ce snapshot est rejoué
à travers les vrais adapters (pas des fakes), et chaque test vérifie
qu'aucune donnée n'est perdue : mêmes joueurs, mêmes types de jeu, mêmes
scores de match après migration, idempotence de la migration des matches
vérifiée explicitement (un deuxième `getAll()` ne regénère pas les ids déjà
migrés).

App 100% local-first sans backend : c'est la seule garantie que les
utilisateurs existants ne perdent rien lors d'une mise à jour.

