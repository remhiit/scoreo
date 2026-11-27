# End-to-end tests

Playwright specs that drive the **built** app (`pnpm build`, then `pnpm preview`
started by `playwright.config.ts`) in a real Chromium. They are the reference for
what a player can do: each player journey has a spec that starts from an empty
app or a fixture and checks what the player sees.

```bash
pnpm build
pnpm --filter scoreo test:e2e              # the whole suite
pnpm --filter scoreo exec playwright test e2e/rename-player.spec.ts
```

## Conventions

- Select elements by accessible role and label (`getByRole`, `getByLabel`,
  `getByText`, `getByPlaceholder`), never by CSS selector or `sc-` class. A few
  older specs (and the design-system checks at the bottom of the table) still
  reach for a selector; don't copy that.
- Start from a clean state: clear `localStorage` in `beforeEach`.
- When a result depends on dates or match order (stats, trophies), seed it from a
  fixture in `fixtures/` through the Import screen (`helpers/importFile.ts`)
  rather than a run of clicks.
- Repeated steps live in `helpers/`, by domain: `players.ts`, `gameTypes.ts`,
  `match.ts`, `history.ts`, `merge.ts`, `stats.ts`, `navigation.ts`,
  `importFile.ts`.

## Journeys → specs

| Area               | Journey                                                                                     | Spec                               |
| ------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| Players            | Add a player                                                                                | `add-player.spec.ts`               |
| Players            | Rename a player (record kept), cancel a rename                                              | `rename-player.spec.ts`            |
| Players            | Delete a player, with or without erasing the name from history                              | `delete-player.spec.ts`            |
| Players            | Clean up deleted players who never played                                                   | `cleanup-inactive-players.spec.ts` |
| Players            | Merge duplicate players                                                                     | `merge-players.spec.ts`            |
| Games              | Create a game with its rules (win condition, scoring mode, tie-break)                       | `create-game-type.spec.ts`         |
| Games              | Change a game's scoring mode, matches already played are recomputed                         | `edit-game-type-rules.spec.ts`     |
| Games              | Merge duplicate games                                                                       | `merge-game-types.spec.ts`         |
| Games              | Archive a game                                                                              | `archive-game-type.spec.ts`        |
| Matches            | Play a full match, stats and ELO updated                                                    | `full-match-flow.spec.ts`          |
| Matches            | Break a tie by manual selection                                                             | `tie-break-manual.spec.ts`         |
| Matches            | Resume a match in progress                                                                  | `resume-draft.spec.ts`             |
| History            | Edit a finished match                                                                       | `edit-match-history.spec.ts`       |
| History            | Delete a match                                                                              | `delete-match-history.spec.ts`     |
| Import             | Import a JSON backup                                                                        | `import-json.spec.ts`              |
| Stats              | Leaderboard, a player's page (record, head-to-head, trophies), head-to-head from both sides | `player-stats.spec.ts`             |
| Hall of Fame       | Trophies empty before any match, crowned after a few matches                                | `hall-of-fame.spec.ts`             |
| Theme and language | Change the theme and the language, kept after a reload                                      | `theme-language.spec.ts`           |
| Modules            | Score a match on a module, reopen it from History                                           | `module-score.spec.ts`             |
| Modules            | Leave a module through its exit bar                                                         | `module-exit-bar.spec.ts`          |
| Modules            | A module's styles don't leak into Scoreo                                                    | `module-style-isolation.spec.ts`   |
| Design system      | Select chevron follows the theme                                                            | `select-chevron-theme.spec.ts`     |
| Design system      | Body uses the design-system font stack                                                      | `theme-font-family.spec.ts`        |

Google Drive sync is not covered: it needs a real OAuth login.
