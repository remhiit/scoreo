# Core Features

## Players

- Persistent player profiles stored across sessions
- Players can participate individually or as part of a team

## Games

- A game involves any number of players or teams
- Each game records a score (numeric, game-specific meaning)
- A game can have one or multiple winners
- No predefined game type — score is a free data point attached to the game

## Results & History

- Full game history: date, participants, teams, scores, winner(s)
- Player statistics: total wins, losses, win ratio

## Offline & Sync

- App works fully offline (local-first)
- Optional sync to a backend (future feature)

## User Flow

1. **Home**: default screen — shows all players with their stats (wins / losses / win %)
   - Tap **▶ New Match** (FAB) to start a match
   - If no players yet: empty state with shortcut to player setup
2. **New Match**: select a game type and players
   - Inline shortcuts to add a game type or player on the fly if none exist
   - Tap **Suivant →** to proceed to score entry
3. **Score Detail**: multi-round score table (columns = players, rows = rounds)
   - Header row: player names
   - Total row: auto-calculated sum per player
   - Editable round rows with **✕** to delete a round
   - **＋** button at the bottom to add a new round
   - Tap **Terminer la partie** to save
   - If game type is **Manual**: modal appears to select winner(s) showing each player's total score
   - Tap **Annuler** to discard and return Home
   - After saving: returns to Home (player stats refresh automatically)
4. **History**: list of all past matches — accessible via the burger menu (☰)
5. **Setup**: manage players and game types — accessible via the burger menu (☰)

## Navigation

Top header bar present on all screens:

| Element | Description |
|---|---|
| ← Back | Returns to Home (visible on all screens except Home) |
| Title | Current screen name |
| ☰ Burger | Opens side menu |

**Burger menu (☰)** contains:

| Item | Description |
|---|---|
| 📋 History | Full match history |
| 👤 Players | Manage player profiles |
| 🎮 Games | Manage game types |

No bottom navigation bar.
