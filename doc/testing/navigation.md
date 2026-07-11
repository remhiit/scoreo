# Navigation (hash router) Tests

**File:** `src/ui/navigation/hash.test.ts`

**Total Tests:** 43 (plus 3 in `src/ui/navigation/useHashRouter.test.ts` for the hook's DOM wiring)

## Overview

Pure unit tests for **routing logic**: URL ↔ Screen mapping. Tests hash fragment parsing (`#/route/params`) and serialization back to hash URLs, with no DOM dependency — `parseHash`/`screenToHash` are plain functions.

## Architecture

### Pure Functions Tested

`src/ui/navigation/hash.ts` exports two pure functions, also the ones used by the real router:

1. **`parseHash(hash: string): Screen`**
   - Parses URL hash (`#/route/...`) into a `Screen` object
   - Handles malformed input gracefully (fallback to `Screen.Home`)

2. **`screenToHash(screen: Screen): string`**
   - Serializes a `Screen` object to a hash URL string
   - Always produces valid, predictable hashes

`src/ui/navigation/useHashRouter.ts` is the hook that syncs a `Screen` with `window.location.hash` via `pushState`/`popstate`, built directly on top of these two functions — so the tests in `hash.test.ts` exercise the exact same code path the app uses, not a duplicate.

### Key Invariants

- `Screen` (`src/ui/navigation/screen.ts`) is a plain discriminated union, no framework dependency
- **Roundtrip guarantee:** `parseHash(screenToHash(screen).replace(/^#/, '')) === original screen`
- All 7 screen types tested (Home, History, Import, Stats, Games, Sync, ScoreDetail)

## Test Categories (43 tests in `hash.test.ts`)

### Hash → Screen Parsing

Tests that hash fragments are correctly parsed into Screen objects: empty hash / root slash → Home, `history`/`stats`/`import`/`games`/`sync` → their respective screens, `score/gt1/alice` and `score/gt1/alice,bob,charlie` → ScoreDetail (new match), `score/gt2/alice,bob/match123` → ScoreDetail (edit).

### Screen → Hash Serialization

Tests that Screen objects are correctly serialized to hash URLs: Home → `#/`, each simple screen → `#/<name>`, ScoreDetail (edit) → `#/score/gt2/alice,bob/match123`.

### Roundtrip Idempotency

Tests that URL → Screen → URL maintains identity for every screen type, including new-match and edit-match ScoreDetail variants.

### Error Handling & Edge Cases

Tests robustness with malformed/edge-case inputs: missing player ids or empty gameTypeId falls back to Home, unknown routes fall back gracefully, extra slashes are ignored, special characters in gameTypeId/playerId/matchId are preserved, empty strings in a CSV player-id list are filtered out.

### ScoreDetail Details & Complex Routes

Extra URL segments beyond the expected shape are ignored; CSV generation for multiple player ids is correct with no trailing comma for a single id.

### Backward Compatibility

`"/"` still recognized as Home; URLs without a `matchId` (create mode) still work; the `matchId` param is optional and additive.

## URL Scheme

### Screen Routes

| Screen | Hash | Format |
|---|---|---|
| **Home** | `#/` | Root only |
| **History** | `#/history` | No params |
| **Stats** | `#/stats` | No params |
| **Import** | `#/import` | No params |
| **Games** | `#/games` | No params |
| **Sync** | `#/sync` | No params |
| **ScoreDetail (new)** | `#/score/{gameTypeId}/{playerIds,csv}` | 3 segments |
| **ScoreDetail (edit)** | `#/score/{gameTypeId}/{playerIds,csv}/{matchId}` | 4 segments |

### Examples

- New match: `#/score/gt1/alice,bob`
- Edit existing: `#/score/gt1/alice,bob/match-123-abc`
- Multiple players: `#/score/game-type/p1,p2,p3`

## Key Design Decisions

1. **Pure logic extraction:** Hash parsing/serialization logic is testable without mocking `window` or the DOM.
2. **Single implementation under test:** `parseHash`/`screenToHash` are exported once from `hash.ts` and imported by both `useHashRouter.ts` (the real router) and `hash.test.ts` — no risk of the tests drifting from production routing code.
3. **CSV for player lists:** Comma-separated list for simple URL encoding (no special chars needed for player IDs).
4. **Optional matchId:** 4th segment is optional; absent → new match, present → edit mode.
5. **Fallback strategy:** Invalid routes → `Screen.Home` (graceful degradation).

## Running Tests

```bash
# All tests (includes navigation)
pnpm test

# Just the navigation tests
pnpm exec vitest run src/ui/navigation
```

## Maintenance Notes

- If adding new Screen types, add corresponding `screenToHash` and `parseHash` cases (and a roundtrip test).
- If modifying ScoreDetail parameters, update the roundtrip tests.
