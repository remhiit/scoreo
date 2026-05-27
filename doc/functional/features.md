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

The app is centered on **recording a match** as the primary action.

1. **On first open**: user lands directly on "New Match"
2. **Setup (one-time)**: players and game types are configured once via the "Setup" tab (⚙️)
   - "Setup" tab contains two sub-sections: **Players** and **Games**
3. **Recording a match**: tap "New Match" (➕) → select game, select players, enter scores, save
   - If no games are configured yet: an inline shortcut leads directly to the Games setup section
   - If no players are configured yet: an inline shortcut leads directly to the Players setup section
4. **After saving**: app navigates automatically to History
5. **History**: lists all past matches with scores and winner(s)

## Navigation

Bottom nav bar with 3 tabs:

| Tab | Icon | Description |
|---|---|---|
| New match | ➕ | Primary action — record a match (default screen) |
| History | 📋 | Full match history |
| Setup | ⚙️ | Manage players and game types (one-time setup) |
