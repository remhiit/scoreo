# Players

`src/ui/home/HomeScreen.tsx`, `homeReducer.ts`, `homeTypes.ts`.

- Add a player by name (trimmed, 1–50 characters, `AddPlayerUseCase`).
- Delete a player (`DeletePlayerUseCase`) — this is a **soft delete**: the record is kept (with `active: false`) so past matches referencing that player still resolve a name in History, but the player no longer appears in the Home list or in new match selection.
- Select 1–4 players (checkboxes) to start a new match. Selection beyond 4 is ignored (`MAX_MATCH_PLAYERS` in `homeReducer.ts`) — the physical game supports 1–4 players.
- **Start match** navigates to score entry (`#/score/<playerIds>`) in create mode.

Not implemented yet (open for a future issue): renaming a player, an undo for deletion, editing a player's avatar/color.
