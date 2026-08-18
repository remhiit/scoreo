# History

`src/ui/history/HistoryScreen.tsx`.

- Lists every saved match, most recent first, one card per match with each player's name, final VP total, and a 🏆 next to the winner(s) (`matchWinners()`, see [`scoring.md`](scoring.md#winner--tie-break)).
- **Edit** re-opens score entry (`#/score/<playerIds>/<matchId>`) pre-filled with the match's saved results (`ScoreDetailMode: 'Edit'`, `UpdateMatchUseCase`).
- **Delete** removes the match permanently (`DeleteMatchUseCase`) — no confirmation dialog yet (open for a future issue).

Not implemented yet: filtering/sorting, per-player stats or a leaderboard across matches.
