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
   - Tap a player card to select/deselect them for the next match (✓ indicator)
   - Bottom of the list: **＋** button to add a new player inline (name input + Add)
   - New players are auto-selected after creation
   - Tap **▶ New Match** (FAB) with at least 2 players selected to proceed
   - If <2 players: FAB appears dimmed, tap shows a toast "Select at least 2 players"
   - If no players yet: empty state with shortcut to player setup

2. **Game Selection** (modal): appears after tapping **▶ New Match**
   - Dropdown to select an existing game type
   - **＋** button to add a new game inline (name + win condition + Add)
   - New game types are auto-selected after creation
   - Tap **Lancer la partie** to proceed to score entry
   - Tap outside the modal or **Cancel** to dismiss

3. **Score Detail**: multi-round score table (columns = players, rows = rounds)
   - Header row: player names
   - Total row: auto-calculated sum per player
   - Editable round rows with **✕** to delete a round
   - **＋** button at the bottom to add a new round
   - Tap **Terminer la partie** to save
   - If game type is **Manual**: modal appears to select winner(s) showing each player's total score
   - Tap **Annuler** to discard and return Home
   - After saving: returns to Home (player stats refresh automatically, player selection reset)

4. **History**: list of all past matches — accessible via the burger menu (☰)

5. **Setup**: manage players and game types — accessible via the burger menu (☰)

### Player Deletion

- Accessible depuis **Setup > Players** : bouton 🗑 sur chaque carte joueur
- Soft-delete : le joueur est masqué (n'apparaît plus dans Home, ni Setup, ni ScoreDetail)
- L'historique des matchs est conservé
- Deux options dans la modale de confirmation :
  - **Par défaut** (checkbox décochée) : nom conservé dans l'historique → "Alice (supprimé)"
  - **Checkbox cochée** (Effacer le nom) : nom blanchi → "Joueur supprimé"
- Les stats du joueur supprimé ne sont plus affichées dans Home
- Les stats des autres joueurs restent inchangées

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
| 📥 Import | Import matches from a JSON file |
| 👤 Players | Manage player profiles |
| 🎮 Games | Manage game types |

No bottom navigation bar.

## Import

- Accessible via **📥 Import** in the burger menu (☰)
- Upload a `.json` file conforming to the schemas at `src/ressource/schemas/import/`
- Supports versions `1.0` and `1.1` (field `version` required)
- **Preview** step shows game name and total matches found
- **Execute** imports match-by-match:
  - ✅ **Imported** — saved successfully
  - ⚠️ **Skipped** — duplicate match ID already exists
  - ❌ **Failed** — round detail scores don't sum to the ranking total
- Unknown game types and players are auto-created
- After execution, refreshes stats and returns to Home

> See [`src/ressource/schemas/import/`](../../src/ressource/schemas/import/) for the full JSON Schema definitions.
