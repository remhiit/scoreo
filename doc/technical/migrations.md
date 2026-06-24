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

