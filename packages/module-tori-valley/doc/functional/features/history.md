# History

`src/ui/history/HistoryScreen.tsx`.

- Lists every saved match, most recent first, one card per match with each player's name, final VP total, and a 🏆 next to the winner(s) (`matchWinners()`, see [`scoring.md`](scoring.md#winner--tie-break)).
- **Edit** re-opens score entry (`#/score/<playerIds>/<matchId>`) pre-filled with the match's saved results (`ScoreDetailMode: 'Edit'`, `UpdateMatchUseCase`).
- **Delete** removes the match permanently (`DeleteMatchUseCase`) — no confirmation dialog yet (open for a future issue).
- **Export for Scoreo** downloads the whole history as `tori-valley-scoreo-<YYYY-MM-DD>.json`, ready to import into Scoreo (`ExportMatchesUseCase` + `downloadJson()`, see [`export.md`](export.md)). Solo matches can't be exported; a notice says how many were left out, and when *every* match is solo no file is produced at all (see the Limits section of [`export.md`](export.md)).

Not implemented yet: filtering/sorting, per-player stats or a leaderboard across matches.
