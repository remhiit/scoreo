# Import

## Use Cases

| Use Case | Method | Input | Output |
|----------|--------|-------|--------|
| `ImportMatchesUseCase` | `preview(jsonString)` | Raw JSON string | `Result<ImportPreview>` |
| `ImportMatchesUseCase` | `execute(jsonString)` | Raw JSON string | `Result<ImportResult>` |

## Data Types

```kotlin
data class ImportPreview(val gameName: String, val count: Int)
data class ImportResult(val imported: Int, val skipped: List<String>, val failed: List<String>)
```

## MVI

| Component | Details |
|-----------|---------|
| **Handler** | `ImportHandler` — `src/commonMain/.../ui/import/ImportHandler.kt` |
| **Intent** | `ImportIntent`: `FileLoaded`, `Execute`, `Reset` |
| **State** | `ImportState`: `step` (IDLE → READY → DONE), `preview`, `jsonContent`, `result`, `error` |

## Screen: ImportScreen

1. **IDLE** — file upload zone (drag-and-drop or click to select .json)
2. **READY** — preview: game name + match count + **Execute** / **Reset** buttons
3. **DONE** — result summary with per-match status (Imported ✅ / Skipped ⚠️ / Failed ❌)

## Import JSON Format

Supports versions `1.0` and `1.1` (field `version` required).

```json
{
  "version": "1.1",
  "game": "Belote",
  "winCondition": "HIGHEST_SCORE",
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": 1767225600000,
      "ranking": [
        { "name": "Alice", "score": 25, "rank": 1 },
        { "name": "Bob",   "score": 18, "rank": 2 }
      ],
      "details": [
        { "scores": [{ "name": "Alice", "score": 10 }, { "name": "Bob", "score": 5 }] },
        { "scores": [{ "name": "Alice", "score": 15 }, { "name": "Bob", "score": 13 }] }
      ]
    }
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `version` | yes | Schema version (`"1.0"` or `"1.1"`) |
| `game` | yes | Game type name (auto-created if new) |
| `winCondition` | no | `HIGHEST_SCORE`, `LOWEST_SCORE`, or `MANUAL` (default: `MANUAL`) |
| `games[]` | yes | Array of match objects |
| `games[].id` | yes | Unique match ID (UUID) |
| `games[].date` | no | Epoch ms timestamp (defaults to import date) |
| `games[].ranking` | yes | ≥2 entries with `name`, `score`, `rank` |
| `games[].details` | no | Round-by-round breakdown (v1.1+) |

### Validation

- `details` scores must sum to the `ranking` score for each player
- If mismatch → match marked as **Failed**
- Duplicate match ID → marked as **Skipped**
- Unknown game type → auto-created
- Unknown player name → auto-created

## Functional Tests

### Successful import
```
Given a valid JSON file with 3 matches for "Belote"
When I upload the file
Then preview shows "Belote" with count 3
When I click Execute
Then 3 matches are imported (Imported ✅)
```

### Duplicate match detection
```
Given a match with id "m1" already exists
When I import JSON containing a match with id "m1"
Then that match is Skipped ⚠️
```

### Score mismatch detection
```
Given a JSON with ranking score 25 but details sum to 20
When I execute the import
Then that match is Failed ❌
```
