# Games

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `AddGameTypeUseCase` | `name: String, winCondition: WinCondition` | `GameType` | Generates UUID v4 |
| `GetGameTypesUseCase` | — | `List<GameType>` | Returns all game types |
| `CreateMatchUseCase` | `gameTypeId, playerScores, date, manualWinners` | `Match` | Validates players match scores list |

## WinCondition

| Value | Behavior |
|-------|----------|
| `HIGHEST_SCORE` | Player(s) with the highest total score win |
| `LOWEST_SCORE` | Player(s) with the lowest total score win |
| `MANUAL` | Player manually selects winner(s) after scoring |

## MVI

| Component | Details |
|-----------|---------|
| **Handler** | `GameTypeHandler` — `src/commonMain/.../ui/gametype/GameTypeHandler.kt` |
| **Intent** | `GameTypeIntent`: `UpdateName`, `SelectWinCondition`, `AddGameType` |
| **State** | `GameTypeState`: `gameTypes`, `inputName`, `selectedWinCondition`, `error` |

## Screen

- Shown in `SetupScreen` (GAME_TYPES tab)
- Text input + win condition dropdown + **Add** button
- List of existing game types with `winCondition` badge

## Functional Tests

### Add a game type
```
Given the Games screen is empty
When I type "Belote", select HIGHEST_SCORE, and click Add
Then "Belote" appears in the list with a "HIGHEST_SCORE" badge
```

### Game type with manual win condition
```
Given the Games screen is empty
When I type "Custom", select MANUAL, and click Add
Then a GameType with winCondition=MANUAL is saved
```

## JSON Schema

```json
{
  "id": "UUID v4",
  "name": "String",
  "winCondition": "HIGHEST_SCORE | LOWEST_SCORE | MANUAL"
}
```
